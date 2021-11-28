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
import { create_exam_schema } from "../lone_schemas/create_exam"
import { business_db } from "../index"
import { courses_table } from "../index"
import { exams_table } from "../index"

let router = express.Router();

const MONGO_SHORT_ID_LEN = 12;
const MONGO_LONG_ID_LEN = 24;


router.use(body_parser.json());
router.post("/create", async (req: Request, res: Response) => {
    try {
        let course: Course = new Course(req.body);
        console.log(course);//To debug
        await courses_table.insertOne(course);
        console.log("Course succesfully inserted");
        let found_course = await courses_table.findOne({creator_email: course.creator_email, title: course.title}, {projection: {_id: 1}});
        if (found_course === undefined) {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
            return;
        }
        let course_id = found_course._id;
        await exams_table.insertOne({_id: course_id, exams: []});
        res.send(config.get_status_message("course_created"));
    } catch (err) {
        let e = <Error>err;
        console.log("Error creating course: ", e);
        if (e.name === "MongoServerError") {
            res.send(config.get_status_message("duplicate_course"));
        } else if (e.name ===  "InvalidConstructionParameters"){
            res.send(config.get_status_message("invalid_body"));
        } else {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    }
})

router.get("/:id", async (req: Request, res: Response) => {
    try{
        let id = req.params.id;
        const Id = schema(String);
        if (!Id(id) || (id.length != MONGO_SHORT_ID_LEN && id.length != MONGO_LONG_ID_LEN)) {
            res.send(config.get_status_message("invalid_course_id"));
            return;
        }
        const my_course = await courses_table.findOne({_id: new ObjectId(id)});
        if (my_course == null) {
            res.send(config.get_status_message("inexistent_course"));
            return;
        }
        console.log(my_course);//To debug
        let response = {"status":"ok", "course":my_course};
        res.send(response);
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});



function send_filtered_courses(res: Response, filter_document: any, projection_document: any) {
    try{
        courses_table.find(filter_document, {projection: projection_document}).toArray(function(err: any, result: any) {
        if (err) {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        } else if (result === undefined) {
            res.send(config.get_status_message("non_existent_filter"));
        } else {
            let courses: any = <Array<Document>>result;
            courses.forEach((course: any) => {
            course.image = course.images[0];
            course.images = undefined;
            });
            res.send({
            ...config.get_status_message("data_sent"),
            "courses": courses
            });
        }
        });
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
}


//TODO: VER SI METEMOS UN ENDPOINT PARA VER LOS TIPOS DE FILTRADO QUE HAY
router.get("/organized/:filter_type/:filter", async (req: Request, res: Response) => {
    let filter_type = req.params.filter_type;
    if (filter_type === "course_type") {
        send_filtered_courses(res, {"course_type": req.params.filter}, {"title": 1, "images": 1, "subscription_type": 1});
    } else if (filter_type === "subscription_type") {
        send_filtered_courses(res, {"subscription_type": req.params.filter}, {"title": 1, "images": 1, "course_type": 1});
    } else {
        res.send(config.get_status_message("non_existent_filter_type"));
    }
});

router.put("/update", async (req: Request, res: Response) => {
    try {
        let new_course: Course = new Course(req.body);
        console.log(new_course);//To debug

        const Id = schema(String)
        if (!Id(req.body.id) || (req.body.id.length != MONGO_SHORT_ID_LEN && req.body.id.length != MONGO_LONG_ID_LEN)) {
            res.send(config.get_status_message("invalid_course_id"));
            return;
        }
        const course_to_update = await courses_table.findOne({_id: new ObjectId(req.body.id)});
        if (course_to_update == null) {
            res.send(config.get_status_message("inexistent_course"));
            return;
        }
        //Check if the editor is the creator
        if (new_course.creator_email !== course_to_update["creator_email"]) {
            res.send(config.get_status_message("invalid_editor"));
            return;
        }

        const update = { "$set": new_course };
        const options = { "upsert": false };
        let { matchedCount, modifiedCount } = await courses_table.updateOne(course_to_update, update, options);
        console.log("matched: ", matchedCount);
        console.log("modified: ", modifiedCount);
        res.send(config.get_status_message("course_updated"));
    } catch(err) {
        console.log(err);
        let error = <Error>err;
        if (error.name === "InvalidConstructionParameters") {
            res.send(config.get_status_message("invalid_body"));
        } else if (error.name === "MongoServerError") {
            res.send(config.get_status_message("duplicate_course"));
        } else {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    }
});


router.put("/create_exam", async (req: Request, res: Response) => {
    if (create_exam_schema(req.body)) {
        try {
            let course: Course = new Course(req.body);
            console.log(course);//To debug
            await courses_table.insertOne(course);
            console.log("Course succesfully inserted");
            res.send(config.get_status_message("course_created"));
        } catch (err) {
            let e = <Error>err;
            console.log("Error creating course: ", e);
            if (e.name === "MongoServerError") {
                res.send(config.get_status_message("duplicate_course"));
            } else if (e.name ===  "InvalidConstructionParameters"){
                res.send(config.get_status_message("invalid_body"));
            } else {
                let message = config.get_status_message("unexpected_error");
                res.status(message["code"]).send(message);
            }
        }
    } else {
        // TODO: MANDAR MENSAJE DE PARAMETROS MAL HECHOS
    }


    try {
        let course: Course = new Course(req.body);
        console.log(course);//To debug
        await courses_table.insertOne(course);
        console.log("Course succesfully inserted");
        res.send(config.get_status_message("course_created"));
    } catch (err) {
        let e = <Error>err;
        console.log("Error creating course: ", e);
        if (e.name === "MongoServerError") {
            res.send(config.get_status_message("duplicate_course"));
        } else if (e.name ===  "InvalidConstructionParameters"){
            res.send(config.get_status_message("invalid_body"));
        } else {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    }
});


module.exports = router;