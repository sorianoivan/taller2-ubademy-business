import express, { Request, Response } from "express";
import schema from "js-schema";
import { Db, MongoAPIError, ObjectId } from "mongodb";
import { Course } from "../models/course";
//import * as mongoDB from "mongodb";
import { UserProfile } from "../models/user_profile";
import { config } from "../configuration/config"
import { InvalidConstructionParameters } from "../models/invalid_construction_parameters";
import e from "express";
const body_parser = require('body-parser');
const mongo = require("mongodb")
import { get_profile_schema } from "../lone_schemas/get_profile"
import { subscribe_to_course_schema } from "../lone_schemas/subscribe_to_course"
import { profiles_table, courses_table } from "../db/database"
const axios = require("axios");
let router = express.Router();
import { logger } from "../utils/logger";

// const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

const PAYMENTS_BACKEND_URL = process.env.PAYMENTS_BACKEND_URL;

router.use(body_parser.json());
router.post("/create", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/create with body:");
    logger.info(req.body);
    try {
        //Send request to create wallet to payments backend
        let wallet_created = await axios.post(PAYMENTS_BACKEND_URL + "/wallet", {
            email: req.body.email,
        })
        .then((response:any) => {
            logger.debug(response.data);
            logger.debug(response.status);
            if (response.data["status"] !== "ok") {
                return false;
            }
            return true;
        })
        .catch((error:any) => {
            logger.error("Error creating wallet:");
            logger.error(error);
            return false;
        });
        if (!wallet_created) {
            logger.info("Error creating profile: could not create wallet");
            res.send({"status":"error", "message":"Profile creation failed: Could not create wallet"});
        } else {
            const user_profile = new UserProfile("", "", req.body.email, "", "Free", [], [], [], []);
            await profiles_table.insertOne(user_profile);
            logger.debug("Profile Created:");
            logger.debug(wallet_created);
            res.send(config.get_status_message("profile_created"));
        }

    } catch (e) {
        let error = <Error>e;
        if (error.name === "InvalidConstructionParameters") {
            logger.info("Error creating profile: InvalidConstructionParameters");
            res.send(config.get_status_message("invalid_body"));
        } else if (error.name === "MongoServerError") {
            logger.info("Error creating profile: user already exists");
            let message = config.get_status_message("existent_user");
            res.status(message["code"]).send(message);
        } else {
            logger.error("Error creating profile: unexpected Error");
            logger.error(e);
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    }
});

router.use(body_parser.json());
router.post("/update", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/update with body");
    logger.info(req.body);
    try {
        const user_profile = new UserProfile(req.body.name, req.body.profile_picture, req.body.email,
                                            req.body.country, "Free", req.body.interesting_genres, [], [], []); // Free because of the schema
        delete user_profile.collaborator_courses; //Hack to prevent collaborator courses reset
        delete user_profile.subscribed_courses; //Hack to prevent subsribed courses reset
        delete user_profile.passed_courses; //Hack to prevent passed courses reset
        delete user_profile.subscription_type; //Hack to prevent subscription type change without paying
        const query = { "email": req.body.email };
        const update = { "$set": user_profile };
        const options = { "upsert": false };

        let { matchedCount, modifiedCount } = await profiles_table.updateOne(query, update, options);
        if (matchedCount === 0) {
            let message = config.get_status_message("non_existent_user");
            logger.info("Error updating profile: user does not exist");
            res.status(message["code"]).send(message);
        } else {
            res.send(config.get_status_message("user_updated"));
        }
    } catch (e) {
        let error = <Error>e;
        if (error.name === "InvalidConstructionParameters") {
            logger.info("Error updating profile: InvalidConstructionParameters");
            res.send(config.get_status_message("invalid_body"));
        } else {
            logger.error("Error updating profile: unexpected Error");
            logger.error(e);
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    }
});

//Funcion para modularizar
const update_subscription = async (email: string, new_subscription: string) => {
    try {
        const query = { "email": email };
        const update = { "$set": {subscription_type: new_subscription} };
        const options = { "upsert": false };

        let { matchedCount, modifiedCount } = await profiles_table.updateOne(query, update, options);
        if (matchedCount === 0) {
            logger.info("Error updating subscription: user does not exist");
            let message = config.get_status_message("non_existent_user");
            return message;
        } else {
            return {"status":"ok", "message":"user subscription updated"};
        }
    } catch (e) {
        logger.error("Error updating subscription: unexpected Error");
        logger.error(e);
        let message = config.get_status_message("unexpected_error");
        return message;
    }
}

router.use(body_parser.json());
router.post("/upgrade_subscription", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/upgrade_subscription with body");
    logger.info(req.body);
    let response:any = await update_subscription(req.body.email, req.body.new_subscription);
    if (response["status"] === "error") {
        res.status(response["code"]).send(response);
        return;
    }
    res.send(response);
});

const modify_subscription = async (user_profile: any, new_subscription: string, res:Response) => {
    let old_sub = config.general_data["subscriptions"][user_profile.subscription_type]["price"]
    if (!(new_subscription in config.general_data["subscriptions"])) {
        logger.info("Error modifying subscription: invalid subscription");
        return {"status":"error", "message":"Invalid subscription"};//Me mandaron una sub que no existe
    }
    let new_sub = config.general_data["subscriptions"][new_subscription]["price"]
    let amount_to_pay = new_sub - old_sub;
    if (amount_to_pay <= 0) {
        let response = await update_subscription(user_profile.email, new_subscription);
        return response;
    }
    return {"status":"ok", "message":"confirm payment", "amount_to_pay":amount_to_pay.toString()};
}

router.use(body_parser.json());
router.post("/modify_subscription", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/modify_subscription with body");
    logger.info(req.body);
    try {
        const user_profile = await profiles_table.findOne({"email": req.body.email});
        if (user_profile == null) {
            logger.info("Error modifying subscription: user does not exist");
            res.send(config.get_status_message("non_existent_user"));
            return;
        }
        //To debug
        logger.debug("USUARIO: ");
        logger.debug(user_profile);
        let response: any = await modify_subscription(user_profile, req.body.new_subscription, res);
        if (response["status"] === "error") {
            logger.warn("ERROR RESPONSE: ");
            logger.warn(response);
            if (response.hasOwnProperty("code")){
                res.status(response["code"]).send(response);
                return;
            } else {
                res.send(response);
                return;
            }
        }
        logger.debug("RESPONSE: ");
        logger.debug(response);
        res.send(response);
    } catch (e) {
        logger.error("Error modifying subscription: unexpected Error");
        logger.error(e);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});

//La primera parte es igual a modify subscription, meterlo en una funcion.
//Esa parte es igual xq en modify subscription lo uso para devolver cuanto tiene que pagar para mostrarlo en el front
//Pero cuando el usuario elige pagar no puedo depender de que el front me mande la cantidad xq lo puede cambiar cualquiera
//asi que solo recibo la nueva suscripcion y hago el calculo de cuanto hay que pagar para mandarselo a payment
router.use(body_parser.json());
router.post("/pay_subscription", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/pay_subscription with body");
    logger.info(req.body);
    try {
        const user_profile = await profiles_table.findOne({"email": req.body.email});
        if (user_profile == null) {
            logger.info("Error paying subscription: user does not exist");
            res.send(config.get_status_message("non_existent_user"));
            return;
        }
        //To debug
        logger.debug("USUARIO: ");
        logger.debug(user_profile);
        let old_sub = config.general_data["subscriptions"][user_profile.subscription_type]["price"]
        if (!(req.body.new_subscription in config.general_data["subscriptions"])) {
            logger.info("Error paying subscription: invalid subscription");
            res.send({"status":"error", "message":"Invalid subscription"});//Me mandaron una sub que no existe
            return;
        }
        let new_sub = config.general_data["subscriptions"][req.body.new_subscription]["price"]
        let amount_to_pay = new_sub - old_sub;
        if (amount_to_pay <= 0) {
            logger.info("Error paying subscription: invalid payment");
            res.send({"status":"error", "message":"Invalid Payment"});//NO deberia llegar una request para pagar una suscripcion menor
            return;
        }

        axios.post(PAYMENTS_BACKEND_URL + "/deposit", {
            email: user_profile.email,
            amountInEthers: amount_to_pay.toString(),
            newSubscription: req.body.new_subscription
        })
        .then((response:any) => {//ver si lo cambio al schema de la response de axios en vez de any
            logger.debug(response.data);
            logger.debug(response.status);
            if (response.data["status"] === "ok") {
                res.send({"status":"ok", "message":"transaction is beign processed"})
            } else {
                logger.info("Error paying subscription: error response from payments backend");
                res.send({"status":"error", "message":response.data["message"]})
            }
        })
        .catch((error:any) => {
            logger.error("Error paying subscription: unexpected Error");
            logger.error(error);
            res.send( {"status":"error", "message":error});
        });
    } catch (e) {
        logger.error("Error paying subscription: unexpected Error");
        logger.error(e);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});

const MONTH_IN_MILLISECONDS = 2592000000;

router.use(body_parser.json());
router.post("/validate_subscription", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/validate_subscription with body");
    logger.info(req.body);
    try {
        const user_profile = await profiles_table.findOne({"email": req.body.email});
        if (user_profile == null) {
            logger.info("Error validating subscription: user does not exist");
            res.send(config.get_status_message("non_existent_user"));//Ver si tiene sentido mandar este error xq en teoria aca
                                                                     //llega cuando el user ya esta logueado, deberia existir
            return;
        }
        // To debug
        logger.debug("USUARIO: ")
        logger.debug(user_profile);

        //Ver si hace falta el await
        await axios.get(PAYMENTS_BACKEND_URL + `/last_deposit/${req.body.email}`)
        .then((response:any) => {
            console.log("RESPONSE: ", response.data);
            if (response.data["status"] === "error") {
                if (response.data["message"] === "User does not have deposits") {
                    logger.info("Error validating subscription: user does not have deposits");
                    res.send({"status":"ok", "message":"User does not have deposits"});
                } else {
                    logger.info("Error validating subscription: could not get last deposit");
                    res.send({"status":"error", "message":"Could not get last deposit"});
                }
                return;
            }
            let last_deposit = new Date(response.data.last_deposit_date)

            logger.debug("LAST DEPOSIT: ");
            logger.debug(last_deposit);

            let date = new Date();
            date.setHours(date.getHours()-3);//Para que sea la hora de argentina

            logger.debug("DATE: ");
            logger.debug(date);

            let time_passed = date.getTime() - last_deposit.getTime();//In milliseconds

            logger.debug("TIME PASSED: ");
            logger.debug(time_passed);

            if (time_passed >= MONTH_IN_MILLISECONDS) {//One month in ms.
                if (user_profile.subscription_type !== "Free") {
                    let amount_to_pay = config.general_data["subscriptions"][user_profile.subscription_type]["price"];
                    console.log("Trying to pay: ", amount_to_pay);
                    axios.post(PAYMENTS_BACKEND_URL + "/deposit", {
                        email: user_profile.email,
                        amountInEthers: amount_to_pay.toString(),
                        newSubscription: user_profile.subscription_type
                    })
                    .then((response:any) => {
                        logger.debug("DEPOSIT RESPONSE: ");
                        logger.debug(response.data);
                        if (response.data["status"] === "ok") {
                            logger.info("Validating subscription: transaction is being processed");
                            res.send({"status":"ok", "message":"transaction is beign processed"})//Si falla le va a poner la sub en free
                        } else {
                            logger.info("Error validating subscription: could not pay (subscription changed to Free");
                            update_subscription(user_profile.email, "Free");
                            res.send({"status":"error", "message":"Could not pay. Changing suscription to Free"})
                        }
                    })
                    .catch((error:any) => {
                        logger.error("Error validating subscription: unexpected Error in deposit request");
                        logger.error(error);
                        update_subscription(user_profile.email, "Free");
                        res.send({"status":"error", "message":"Could not pay. Changing suscription to Free"})
                    });
                } else {
                    res.send({"status":"ok", "message":"Free subscription doesnt need payments"});
                }
            } else {
                res.send({"status":"ok", "message":"Subscription is still valid"});
            }
        })
        .catch((error:any) => {
            logger.error("Error validating subscription: unexpected Error in payments request");
            logger.error(error);
            res.send( {"status":"error", "message":error});
        });
    } catch (e) {
        logger.error("Error validating subscription: unexpected Error");
        logger.error(e);
        res.send({"status":"error", "message":"Unexpected error"});
    }
});

router.get("/countries", (req: Request, res: Response) => {
    logger.info("Received GET request at /profiles/countries");
    res.send({
        ...config.get_status_message("data_sent"),
        "locations": config.get_available_countries()
    });
});

router.get("/course_genres", (req: Request, res: Response) => {
    logger.info("Received GET request at /profiles/course_genres");
    res.send({
        ...config.get_status_message("data_sent"),
        "course_genres": Array.from(config.get_available_genres())
    });
});

router.get("/subscription_types", (req: Request, res: Response) => {
    logger.info("Received GET request at /profiles/subscription_types");
    res.send({
        ...config.get_status_message("data_sent"),
        "types": config.get_subscription_types()
    });
});

router.get("/subscription_types_names", (req: Request, res: Response) => {
    logger.info("Received GET request at /profiles/subscription_types_names");
    res.send({
        ...config.get_status_message("data_sent"),
        "types": Object.keys(config.get_subscription_types())
    });
});

router.get("/:user_email/:account_type/:profile_email", async (req: Request, res: Response) => {
    logger.info(`Received GET request at /profiles/${req.params.user_email}/${req.params.account_type}/${req.params.profile_email}`);
    if (!get_profile_schema(req.params)) {
        logger.info("Error getting user profile: invalid arguments");
        res.send(config.get_status_message("invalid_args"));
    } else {
        let has_private_access = false;
        if ((req.params.user_email === req.params.profile_email) || (req.params.account_type === "admin")) {
            has_private_access = true;
        }
        await profiles_table.find({"email": req.params.profile_email}).toArray(async function(err: any, result: any) {
        if (err) {
            logger.error("Error getting users profile: unexpected error getting profile");
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        } else if (result === undefined) {
            logger.info("Error getting users profile: user does not exist");
            let message = config.get_status_message("non_existent_user");
            res.status(message["code"]).send(message);
        } else if (result.length !== 1) {
            logger.info("Error getting users profile: duplicated profile");
            let message = config.get_status_message("duplicated_profile");
            res.status(message["code"]).send(message);
        } else {
            let document: any = (<Array<Document>>result)[0];
            let document_to_send: any = {};
            if (!has_private_access) {
                config.get_public_profile_data().forEach((profile_field: string) => {
                    document_to_send[profile_field] = document[profile_field];
                });
            } else {
                document_to_send = document;
                logger.debug("DOC: ");
                logger.debug(document);
                await axios.get(PAYMENTS_BACKEND_URL + `/wallet/${document.email}`)
                .then((response:any) => {
                    logger.debug("RESPONSE: ");
                    logger.debug(response.data);
                    if (response.data["status"] === "error") {
                        logger.error("Error getting users profile: unexpected error in payments response");
                        document_to_send = {...document_to_send, "wallet_data":{"address":undefined, "balance":undefined}};
                    } else {
                        document_to_send = {...document_to_send, "wallet_data":{"address":response.data.address, "balance":response.data.balance}};
                    }
                })
                .catch((error:any) => {
                    logger.error("Error getting users profile: unexpected error in payments request");
                    logger.error(error);
                    document_to_send = {...document_to_send, "wallet_data":{"address":undefined, "balance":undefined}};
                });
            }
            res.send({
                ...config.get_status_message("data_sent"),
                "profile": document_to_send
            });
        }
        });
    }
});


function can_subscribe(user_subscription: string, course_subscription: string): boolean {
    let subscriptions: any = config.get_subscription_types();
    return subscriptions[user_subscription]["price"] >= subscriptions[course_subscription]["price"];
}

const pay_creator = async (creator_email: string, course_subscription: string) => {
    let amount_to_pay = config.get_subscription_types()[course_subscription]["price"] / 5;
    console.log("AMOUNT TO PAY: ", amount_to_pay);
    console.log("EMAIL: ", creator_email);
    console.log("SUB: ", course_subscription);
    let response = await axios.post(PAYMENTS_BACKEND_URL + "/pay_creator", {
        amountInEthers: amount_to_pay.toString(),
        creatorEmail: creator_email,
        courseSubscription: course_subscription,
    });
    logger.debug("PAY CREEATOR RESPONSE: ");
    logger.debug(response.data);
}


router.post("/subscribe_to_course", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/subscribe_to_course with body:");
    logger.info(req.body);
    if (subscribe_to_course_schema(req.body)) {
        try {
            let existing_course = await courses_table.findOne({_id: new ObjectId(req.body.course_id)},
                                    {projection: { "_id": 1, "collaborators": 1, "creator_email": 1, "students": 1, "subscription_type": 1}});
            let user = await profiles_table.findOne({email: req.body.user_email},
                    {projection: { "_id": 1,
                                   "subscribed_courses": 1,
                                   "subscription_type": 1,
                     }});
            if (existing_course === null) {
                logger.info("Error subscribing to course: course does not exist");
                res.send(config.get_status_message("non_existent_course"));
                return;
            }
            if (user === null) {
                logger.info("Error subscribing to course: user does not exist");
                let message = config.get_status_message("non_existent_user");
                res.status(message["code"]).send(message);
                return;
            }
            if ((req.body.user_email === existing_course.creator_email) || (existing_course.collaborators.includes(req.body.user_email))) {
                logger.info("Error subscribing to course: user is course professor");
                res.send(config.get_status_message("user_is_proffessor"));
                return;
            }
            if (can_subscribe(user.subscription_type, existing_course.subscription_type)) {
                if (!existing_course.students.includes(req.body.user_email)) {
                    existing_course.students.push(req.body.user_email);
                }
                if (!user.subscribed_courses.includes(req.body.course_id)) {
                    user.subscribed_courses.push(req.body.course_id);
                }
                await courses_table.updateOne({_id: new ObjectId(req.body.course_id)}, {"$set": {students: existing_course.students}});
                await profiles_table.updateOne({email: req.body.user_email}, {"$set": {subscribed_courses: user.subscribed_courses}});
                if (existing_course.subscription_type !== "Free") {
                    await pay_creator(existing_course.creator_email, existing_course.subscription_type);
                }
                res.send(config.get_status_message("subscription_added"));
            } else {
                logger.info("Error subscribing to course: wrong subscription");
                res.send(config.get_status_message("wrong_subscription"));
            }
        } catch (err) {
            logger.error("Error subscribing to course: unexpected Error");
            logger.error(err);
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    } else {
        logger.warn("Error subscribing to course: invalid request body");
        res.send(config.get_status_message("invalid_body"));
    }
});



router.post("/unsubscribe_from_course", async (req: Request, res: Response) => {
    logger.info("Received POST request at /profiles/unsubscribe_from_course with body:");
    logger.info(req.body);
    if (subscribe_to_course_schema(req.body)) {
        try {
            let existing_course = await courses_table.findOne({_id: new ObjectId(req.body.course_id)},
                                    {projection: { "_id": 1, "collaborators": 1, "creator_email": 1, "students": 1, "subscription_type": 1}});
            let user = await profiles_table.findOne({email: req.body.user_email},
                    {projection: { "_id": 1,
                                   "subscribed_courses": 1,
                                   "subscription_type": 1,
                     }});
            if (existing_course === null) {
                logger.info("Error unsubscribing from course: course does not exist");
                res.send(config.get_status_message("non_existent_course"));
                return;
            }
            if (user === null) {
                logger.info("Error unsubscribing from course: user does not exist");
                let message = config.get_status_message("non_existent_user");
                res.status(message["code"]).send(message);
                return;
            }
            let student_index = existing_course.students.indexOf(req.body.user_email);
            if (student_index > -1) {
                existing_course.students.splice(student_index, 1);
            }
            let course_index = user.subscribed_courses.indexOf(req.body.course_id);
            if (course_index > -1) {
                user.subscribed_courses.splice(course_index, 1);
            }
            await courses_table.updateOne({_id: new ObjectId(req.body.course_id)}, {"$set": {students: existing_course.students}});
            await profiles_table.updateOne({email: req.body.user_email}, {"$set": {subscribed_courses: user.subscribed_courses}});
            res.send(config.get_status_message("subscription_deleted"));

        } catch (err) {
            logger.error("Error unsubscribing from course: unexpected Error");
            logger.error(err);
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    } else {
        logger.warn("Error unsubscribing from course: invalid request body");
        res.send(config.get_status_message("invalid_body"));
    }
});



router.get("/my_courses/:user_email", async (req: Request, res: Response) => {
    logger.info(`Received GET request at /profiles/my_courses/${req.params.user_email}`);
    let has_private_access = false;
    if ((req.params.user_email === req.params.profile_email) || (req.params.account_type === "admin")) {
        has_private_access = true;
    }

    let user_profile = await profiles_table.findOne({"email": req.params.user_email},
                                      {projection: {
                                          "collaborator_courses": 1,
                                          "subscribed_courses": 1,
                                      }});

    user_profile.collaborator_courses = user_profile.collaborator_courses.map(function(course_id: string) {
        return new ObjectId(course_id);
    });
    user_profile.subscribed_courses = user_profile.subscribed_courses.map(function(course_id: string) {
        return new ObjectId(course_id);
    });
    let collaborator_courses_names = await courses_table.find({_id: {"$in": user_profile.collaborator_courses}}, {projection: {_id: 1, "creator_email": 1, "title": 1}}).toArray();
    let subscribed_courses_names = await courses_table.find({_id: {"$in": user_profile.subscribed_courses}}, {projection: {_id: 1, "creator_email": 1, "title": 1}}).toArray();

    let user_courses = await courses_table.find({"creator_email": req.params.user_email},
                                          {projection: {
                                              "title": 1,
                                          }}).toArray();

    res.send({...config.get_status_message("got_courses"), "collaborator": collaborator_courses_names, "creator": user_courses, "student": subscribed_courses_names});
});




module.exports = router;