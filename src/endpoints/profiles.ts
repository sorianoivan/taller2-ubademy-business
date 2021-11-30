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
import { profiles_table } from "../index"
const axios = require("axios");

let router = express.Router();

// const profiles_table = business_db.collection(process.env.PROFILES_TABLE || "Profiles");

const PAYMENTS_BACKEND_URL = process.env.PAYMENTS_BACKEND_URL;

router.use(body_parser.json());
router.post("/create", async (req: Request, res: Response) => {
    try {
        const user_profile = new UserProfile("", "", req.body.email, "", "Free", []);
        await profiles_table.insertOne(user_profile);
        //Send request to create wallet to payments backend
        axios.post(PAYMENTS_BACKEND_URL + "/wallet", {
            email: req.body.email,
        })
        .then((response:any) => {//ver si lo cambio al schema de la response de axios en vez de any
            console.log(response.data);
            console.log(response.status);
            //Chequear si status es error y devolver el mensaje correspondiente
            //Ver si hace falta meter algo de la wallet en el perfil.
        })
        .catch((error:any) => {
            console.log(error);
            //retornar error
        });
        res.send(config.get_status_message("profile_created"));
    } catch (e) {
        let error = <Error>e;
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
                                            req.body.country, req.body.subscription_type, req.body.interesting_genres);
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

//TODO:Estas funciones son para q el endpoint de modify_subscription no sea de 100 lineas pero nose si van aca o en otro archivo

const update_user_subscription = async (email:string, new_subscription:string, res:Response) => {
    try {
        const query = { "email": email };
        const update = { "$set": {subscription_type:new_subscription} };//Ver si esto esta bien
        const options = { "upsert": false };

        let { matchedCount, modifiedCount } = await profiles_table.updateOne(query, update, options);
        if (matchedCount === 0) {        
            let message = config.get_status_message("non_existent_user");
            res.status(message["code"]).send(message);
        } else {
            res.send({"status":"ok", "message":"user subscription updated"});
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
}

const modify_subscription = (result: Array<Document>, new_subscription: string, email:string, res:Response) => {
    let user: any = (<Array<Document>>result)[0];
    console.log("USER: ", user);
    //Chequear si pago hace menos de un mes
    let old_sub = config.general_data["subscriptions"][user.subscription_type]["price"]
    let new_sub = config.general_data["subscriptions"][new_subscription]["price"]
    let amount_to_pay = new_sub - old_sub;
    if (amount_to_pay <= 0) {
        res.send({"status":"error", "message":"cannot downgrade subscription"});
        return;
    }
    axios.post(PAYMENTS_BACKEND_URL + "/deposit", {
        email: email,
        amountInEthers: amount_to_pay.toString(),
    })
    .then((response:any) => {//ver si lo cambio al schema de la response de axios en vez de any
        console.log(response.data);
        console.log(response.status);
        if (response.data["status"] === "ok" && response.data["message"] === "Successful transaction") {//Chequeo las dos cosas por las dudas pero no es neecsario
            //Hacer update en mongo
            update_user_subscription(email, new_subscription, res);
        } else {
            res.send({"status":"error", "message":response.data})
        }
    })
    .catch((error:any) => {
        console.log(error);
        res.send( {"status":"error", "message":error});
    });
}

router.use(body_parser.json());
router.post("/modify_subscription", async (req: Request, res: Response) => {
    try {
       //buscar al usuario en profiles table
        profiles_table.find({"email": req.body.email}).toArray(function(err: any, result: any) {
            if (err) {
                let message = config.get_status_message("unexpected_error");
                res.status(message["code"]).send(message);
            } else if (result === undefined) {
                let message = config.get_status_message("non_existent_user");//Shouldnt happen
                res.status(message["code"]).send(message);
            } else if (result.length !== 1) {//Si length da 0 entra aca
                let message = config.get_status_message("duplicated_profile");
                res.status(message["code"]).send(message);
            } else {
                modify_subscription(result, req.body.new_subscription, req.body.email, res);
            }
        });
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

module.exports = router;