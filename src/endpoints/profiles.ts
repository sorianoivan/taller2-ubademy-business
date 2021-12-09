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
import { profiles_table, courses_table } from "../index"
const axios = require("axios");
let router = express.Router();

// const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

const PAYMENTS_BACKEND_URL = process.env.PAYMENTS_BACKEND_URL;

router.use(body_parser.json());
router.post("/create", async (req: Request, res: Response) => {
    try {
        const user_profile = new UserProfile("", "", req.body.email, "", "Free", [], [], [], []);
        await profiles_table.insertOne(user_profile);
        //Send request to create wallet to payments backend
        axios.post(PAYMENTS_BACKEND_URL + "/wallet", {
            email: req.body.email,
        })
        .then((response:any) => {//ver si lo cambio al schema de la response de axios en vez de any
            console.log(response.data);
            console.log(response.status);
            if (response.data["status"] !== "ok") {
                res.send({"status":"error", "message":response.data["message"]});
                return;
            }
        })
        .catch((error:any) => {
            console.log("Error creating wallet: ", error);
            res.send({"status":"error", "message":"could not create wallet"});
            return;
        });
        res.send(config.get_status_message("profile_created"));
    } catch (e) {
        let error = <Error>e;
        console.log("Error:", e);
        if (error.name === "InvalidConstructionParameters") {
            res.send(config.get_status_message("invalid_body"));
        } else if (error.name === "MongoServerError") {
            let message = config.get_status_message("existent_user");
            res.status(message["code"]).send(message);
        } else {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    }
});

router.use(body_parser.json());
router.post("/update", async (req: Request, res: Response) => {
    try {
        const user_profile = new UserProfile(req.body.name, req.body.profile_picture, req.body.email, 
                                            req.body.country, req.body.subscription_type, req.body.interesting_genres, [], [], []);
        delete user_profile.collaborator_courses; //Hack to prevent collaborator courses reset
        delete user_profile.subscribed_courses; //Hack to prevent subsribed courses reset
        delete user_profile.passed_courses; //Hack to prevent passed courses reset
        const query = { "email": req.body.email };
        const update = { "$set": user_profile };
        const options = { "upsert": false };

        let { matchedCount, modifiedCount } = await profiles_table.updateOne(query, update, options);
        if (matchedCount === 0) {
            let message = config.get_status_message("non_existent_user");
            res.status(message["code"]).send(message);
        } else {
            res.send(config.get_status_message("user_updated"));
        }
    } catch (e) {
        let error = <Error>e;
        console.log(error.name);
        if (error.name === "InvalidConstructionParameters") {
            res.send(config.get_status_message("invalid_body"));
        } else {
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
            let message = config.get_status_message("non_existent_user");
            return message;
        } else {
            return {"status":"ok", "message":"user subscription updated"};
        }
    } catch (e) {
        console.log(e);
        let message = config.get_status_message("unexpected_error");
        return message;
    }
}

router.use(body_parser.json());
router.post("/upgrade_subscription", async (req: Request, res: Response) => {
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
    try {
        const user_profile = await profiles_table.findOne({"email": req.body.email});
        if (user_profile == null) {
            res.send(config.get_status_message("non_existent_user"));
            return;
        }
        console.log("USUARIO: ", user_profile);//To debug
        let response: any = await modify_subscription(user_profile, req.body.new_subscription, res);
        if (response["status"] === "error") {
            console.log("ERROR RESPONSE: ", response);
            if (response.hasOwnProperty("code")){
                res.status(response["code"]).send(response);
                return;
            } else {
                res.send(response);
                return;
            }
        }
        console.log("RESPONSE: ", response);
        res.send(response);
    } catch (e) {
        console.log(e);
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
    try {
        const user_profile = await profiles_table.findOne({"email": req.body.email});
        if (user_profile == null) {
            res.send(config.get_status_message("non_existent_user"));
            return;
        }
        console.log("USUARIO: ", user_profile);//To debug
        let old_sub = config.general_data["subscriptions"][user_profile.subscription_type]["price"]
        if (!(req.body.new_subscription in config.general_data["subscriptions"])) {
            res.send({"status":"error", "message":"Invalid subscription"});//Me mandaron una sub que no existe
            return;
        }
        let new_sub = config.general_data["subscriptions"][req.body.new_subscription]["price"]
        let amount_to_pay = new_sub - old_sub;
        if (amount_to_pay <= 0) {
            res.send({"status":"error", "message":"Invalid Payment"});//NO deberia llegar una request para pagar una suscripcion menor
            return;
        }
        
        axios.post(PAYMENTS_BACKEND_URL + "/deposit", {
            email: user_profile.email,
            amountInEthers: amount_to_pay.toString(),
            newSubscription: req.body.new_subscription
        })
        .then((response:any) => {//ver si lo cambio al schema de la response de axios en vez de any
            console.log(response.data);
            console.log(response.status);
            if (response.data["status"] === "ok") {
                res.send({"status":"ok", "message":"transaction is beign processed"})
            } else {
                res.send({"status":"error", "message":response.data["message"]})
            }
        })
        .catch((error:any) => {
            console.log(error);
            res.send( {"status":"error", "message":error});
        });
    } catch (e) {
        console.log(e);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});

router.get("/countries", (req: Request, res: Response) => {
    res.send({
        ...config.get_status_message("data_sent"), 
        "locations": config.get_available_countries()
    });
});

router.get("/course_genres", (req: Request, res: Response) => {
    res.send({
        ...config.get_status_message("data_sent"), 
        "course_genres": Array.from(config.get_available_genres())
    });
});

router.get("/subscription_types", (req: Request, res: Response) => {
    res.send({
        ...config.get_status_message("data_sent"), 
        "types": config.get_subscription_types()
    });
});

router.get("/:user_email/:account_type/:profile_email", (req: Request, res: Response) => {
if (!get_profile_schema(req.params)) {
    res.send(config.get_status_message("invalid_args"));
} else {
    let has_private_access = false;
    if ((req.params.user_email === req.params.profile_email) || (req.params.account_type === "admin")) {
    has_private_access = true;
    }
    profiles_table.find({"email": req.params.profile_email}).toArray(function(err: any, result: any) {
    if (err) {
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    } else if (result === undefined) {
        let message = config.get_status_message("non_existent_user");
        res.status(message["code"]).send(message);
    } else if (result.length !== 1) {
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


router.post("/subscribe_to_course", async (req: Request, res: Response) => {
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
                res.send(config.get_status_message("non_existent_course"));
                return;
            }
            if (user === null) {
                let message = config.get_status_message("non_existent_user");
                res.status(message["code"]).send(message);
                return;
            }
            if ((req.body.user_email === existing_course.creator_email) || (existing_course.collaborators.includes(req.body.user_email))) {
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
                res.send(config.get_status_message("subscription_added"));
            } else {
                res.send(config.get_status_message("wrong_subscription"));
            }
        } catch (err) {
            console.log(err);
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    } else {
        res.send(config.get_status_message("invalid_body"));
    }
});



router.post("/unsubscribe_from_course", async (req: Request, res: Response) => {
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
                res.send(config.get_status_message("non_existent_course"));
                return;
            }
            if (user === null) {
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
            console.log(err);
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    } else {
        res.send(config.get_status_message("invalid_body"));
    }
});

module.exports = router;