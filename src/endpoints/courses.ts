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
import { publish_exam_schema } from "../lone_schemas/publish_exam"
import { complete_exam_schema } from "../lone_schemas/complete_exam"
import { grade_exam_schema } from "../lone_schemas/grade_exam"
import { add_collaborator_schema } from "../lone_schemas/add_collaborator"
import { grade_course_schema } from "../lone_schemas/grade_course"
import { business_db, courses_table, exams_table, profiles_table } from "../index"
import { Exam } from "../models/exam"
import { CompletedExam } from "../models/completed_exam";
import { CourseGrading } from "../models/course_grading";


let router = express.Router();

const MONGO_SHORT_ID_LEN = 12;
const MONGO_LONG_ID_LEN = 24;

// const NOT_CORRECTED_STATUS = "Not corrected";
// const FAILED_STATUS = "Failed";
// const PASSED_CORRECTED_STATUS = "Passed";
const PASSING_MARK = 4;
const NOT_CORRECTED_MARK = -1;

router.use(body_parser.json());
router.post("/create", async (req: Request, res: Response) => {
    try {
        req.body.collaborators = [];
        req.body.students = [];
        req.body.students_grading = [];
        let course: Course = new Course(req.body);
        console.log(course);//To debug
        await courses_table.insertOne(course);
        console.log("Course succesfully inserted");

        //TODO: TAL VEZ NO HACE FALTA HACER ESTE FIND PORQUE INSERT YA TE DEVUELVE EL ID, SE PUEDE CAMBIAR
        let found_course = await courses_table.findOne({creator_email: course.creator_email, title: course.title}, {projection: {_id: 1}});
        if (found_course === null) {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
            return;
        }
        let course_id = found_course._id;
        await exams_table.insertOne({_id: course_id, exams: [], exams_amount: 0});
        res.send({...config.get_status_message("course_created"), "id": course_id});
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

const can_see_full_course = (user: any, course: any) =>  {
    let user_sub = config.get_subscription_types()[user.subscription_type]["price"];
    let course_required_sub = config.get_subscription_types()[course.subscription_type]["price"];
    return (user_sub >= course_required_sub && course.students.includes(user.email));
}

//Este es para que el creador o los colaboradores vean los datos del curso
router.get("/data/:id/:email/:privilege", async (req: Request, res: Response) =>  {
    try{
        let id = req.params.id;
        let email = req.params.email;
        let privilege = req.params.privilege;
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
        const user = await profiles_table.findOne({"email": email});
        if ((user == null) && (privilege !== "admin")) {
            res.send(config.get_status_message("non_existent_user"));
            return;
        }
        console.log(user);//To debug
        if (privilege === 'admin' || user.email === my_course.creator_email || my_course.collaborators.includes(user.email)) {
            res.send({...config.get_status_message("data_sent"), "course": my_course, "info_level":"full"});//Le mando todo
        } else if (can_see_full_course(user, my_course)) {//Si esta suscripto y le alcanza la suscripcion
            let preview_course = my_course;
            preview_course.collaborators = undefined;
            preview_course.students = undefined;
            res.send({...config.get_status_message("data_sent"), "course": preview_course, "info_level":"subscription"});//Todo menos alumnos y colaboradores
        } else {
            let preview_course = my_course;
            preview_course.collaborators = undefined;
            preview_course.students = undefined;
            preview_course.videos = undefined;
            preview_course.images = [my_course.images[0]];
            preview_course.total_exams = undefined;
            res.send({...config.get_status_message("data_sent"), "course": preview_course, "info_level":"basic"});//Mando solo lo basico
        }
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
        } else if (result === null) {
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

router.get("/organized/:course_filter/:subscription_filter/:is_admin", async (req: Request, res: Response) => {
    let filter: any = {};
    let projection: any = {"title": 1, "images": 1, "subscription_type": 1, "course_type": 1};
    if (req.params.course_filter !== "none") {
        filter.course_type = req.params.course_filter;
    }
    if (req.params.subscription_filter !== "none") {
        filter.subscription_type = req.params.subscription_filter;
    }

    if ((Object.keys(filter).length !== 0) || (req.params.is_admin === "true")) {
        send_filtered_courses(res, filter, projection);
    } else {
        res.send(config.get_status_message("no_filter"));
    }
});

router.put("/update", async (req: Request, res: Response) => {
    try {
        let new_course: Course = new Course(req.body);
        delete new_course.collaborators;
        delete new_course.students;
        delete new_course.students_grading;
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


router.post("/create_exam", async (req: Request, res: Response) => {
    if (create_exam_schema(req.body) && (req.body.questions.length !== 0)) {
        try {
            let course_doc = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, 
                                                        {projection: { 
                                                            "total_exams": 1,
                                                            "creator_email": 1,
                                                        }});
            if (req.body.exam_creator_email !== course_doc.creator_email) {
                res.send(config.get_status_message("not_the_creator")); 
                return;
            }
            let exams_doc = await exams_table.findOne({_id: new ObjectId(req.body.course_id)}, {projection: { "exams_amount": 1 }});

            if (course_doc === null) {
                res.send(config.get_status_message("course_not_found"));
            } else if (exams_doc === null) {
                let message = config.get_status_message("no_exam_doc_for_course");
                res.status(message["code"]).send(message);
            } else {
                let max_exams_amount = course_doc.total_exams;
                let existing_exams = exams_doc.exams_amount;
                if (max_exams_amount !== existing_exams) {
                    let exam = new Exam(req.body.exam_name, req.body.questions, []);
                    let existing_exam = await exams_table.findOne({_id: new ObjectId(req.body.course_id), "exams.exam_name": req.body.exam_name}, {projection: { exams: 1 }});
                    if (existing_exam === null) {
                        await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, {"$push": {"exams": exam}, "$set": {"exams_amount": existing_exams + 1}});
                        res.send(config.get_status_message("exam_created"));
                    } else {
                        res.send(config.get_status_message("exam_already_exists"));
                    }
                } else {
                    let message = config.get_status_message("max_number_of_exams");
                    res.send(message);
                }
            }
        } catch (err) {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    } else {
        res.send(config.get_status_message("invalid_body"));
    }
});


router.post("/publish_exam", async (req: Request, res: Response) => {
    if (publish_exam_schema(req.body)) {
        try {
            let proffessors = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, {projection: { 
                                                                                                        _id: 0, 
                                                                                                        "creator_email": 1,
                                                                                                    }});
            if (req.body.exam_creator_email !== proffessors.creator_email) {
                res.send(config.get_status_message("not_the_creator")); 
                return;
            }

            let existing_exam = await exams_table.aggregate([
                {"$match": {"$expr": {"$eq": ["$_id", new ObjectId(req.body.course_id)]}}},
                {"$unwind": {"path": "$exams"}},
                {"$match": {"$expr": {"$eq": ["$exams.exam_name", req.body.exam_name]}}},
                {"$project": {"id": "$_id"}}
            ]).toArray();
            if (existing_exam.length === 0) {
                res.send(config.get_status_message("non_existent_exam"));
                return;
            } else {
                let update_document_query = {"$set": {
                    "exams.$[s].is_published": true,
                  }};
                let array_filter = {arrayFilters: [ {"s.exam_name": req.body.exam_name} ], "multi": true};
                await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, update_document_query, array_filter);
                res.send(config.get_status_message("exam_published"));
            }
        } catch (err) {
            let message = config.get_status_message("unexpected_error");
            res.status(message["code"]).send(message);
        }
    } else {
        res.send(config.get_status_message("invalid_body"));
    }
});


router.post("/edit_exam", async (req: Request, res: Response) => {
    if (create_exam_schema(req.body)) {
        try {
            let proffessors = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, {projection: { 
                                                                                                        _id: 0, 
                                                                                                        "creator_email": 1,
                                                                                                    }});
            if (req.body.exam_creator_email !== proffessors.creator_email) {
                res.send(config.get_status_message("not_a_proffessor")); 
                return;
            }


            let existing_exam = await exams_table.aggregate([
                {"$match": {"$expr": {"$eq": ["$_id", new ObjectId(req.body.course_id)]}}},
                {"$unwind": {"path": "$exams"}},
                {"$match": {"$expr": {"$eq": ["$exams.exam_name", req.body.exam_name]}}},
                {"$project": {"is_published": "$exams.is_published"}}
            ]).toArray();
            if (existing_exam.length === 0) {
                res.send(config.get_status_message("non_existent_exam"));
                return;
            } else {
                if (!existing_exam[0].is_published) {
                    let update_document_query = {"$set": {
                        "exams.$[s].questions": req.body.questions,
                      }};
                    let array_filter = {arrayFilters: [ {"s.exam_name": req.body.exam_name} ], "multi": true};
                    await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, update_document_query, array_filter);
                    res.send(config.get_status_message("exam_edited"));
                } else {
                    res.send(config.get_status_message("exam_already_published"));
                }
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


router.post("/complete_exam", async (req: Request, res: Response) => {
    if (complete_exam_schema(req.body)) {
        try {
            let students = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, {projection: { 
                                                                                                        _id: 0, 
                                                                                                        "students": 1
                                                                                                    }});

            if (!students.students.includes(req.body.student_email)) {
                res.send(config.get_status_message("not_from_course"));
                return;
            }

            let existing_exam = await exams_table.aggregate(
                        [{"$match": {"$expr": {"$eq": ["$_id", new ObjectId(req.body.course_id)]}}},
                          {"$unwind": {"path": "$exams"}},
                          {"$match": {"$expr": {"$eq": ["$exams.exam_name", req.body.exam_name]}}},
                          {"$match": {"$expr": {"$eq": ["$exams.is_published", true]}}},
                          {"$project": 
                            {"_id": 0,
                              "questions": "$exams.questions"}}]).toArray();

            if (existing_exam.length === 0) {
                res.send(config.get_status_message("non_existent_exam")); return;
            } else if (existing_exam.length === 1) {
                let questions = existing_exam[0].questions;
                if (questions.length === req.body.answers.length) {
                    let answered_exam = await exams_table.aggregate(
                        [{"$match": {"$expr": {"$eq": ["$_id", new ObjectId(req.body.course_id)]}}},
                          {"$unwind": {"path": "$exams"}},
                          {"$match": {"$expr": {"$eq": ["$exams.exam_name", req.body.exam_name]}}},
                          {"$unwind": {"path": "$exams.students_exams"}},
                          {"$match": 
                            {"$expr": {"$eq": ["$exams.students_exams.student_email", req.body.student_email]}}},
                          {"$project": 
                            {"_id": 0,
                              "mark": "$exams.students_exams.mark"}}]).toArray();



                    if (answered_exam.length === 0) {
                        let student_exam = new CompletedExam(req.body.student_email, req.body.answers, [], NOT_CORRECTED_MARK);
                        let exam_to_update_query = {_id: new ObjectId(req.body.course_id)};
                        let update_document_query = {"$push": {
                                                                "exams.$[s].students_exams": student_exam,
                                                            }};
                        let array_filter = {arrayFilters: [{"s.exam_name": req.body.exam_name} ], "multi": true};
                        await exams_table.updateOne(exam_to_update_query, update_document_query, array_filter);
                        res.send(config.get_status_message("exam_answered")); return;
                    } else if (answered_exam.length === 1) {
                        let exam_mark = answered_exam[0].mark;
                        if ((exam_mark >= PASSING_MARK) || (exam_mark === NOT_CORRECTED_MARK)) {
                            res.send(config.get_status_message("exam_passed_or_waiting_correction")); return;
                        } else {
                            let exam_to_update_query = {_id: new ObjectId(req.body.course_id)};
                            let update_document_query = {"$set": {
                                                                  "exams.$[s].students_exams.$[e].mark": NOT_CORRECTED_MARK,
                                                                  "exams.$[s].students_exams.$[e].answers": req.body.answers,
                                                                  "exams.$[s].students_exams.$[e].professors_notes": []
                                                                }};
                            let array_filter = {arrayFilters: [ {"e.student_email": req.body.student_email}, {"s.exam_name": req.body.exam_name} ], "multi": true};
                            await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, update_document_query, array_filter);
                            res.send(config.get_status_message("exam_answered")); return;
                        }
                    } else {
                        let message = config.get_status_message("duplicated_exam_completion");
                        res.status(message["code"]).send(message); return;
                    }
                } else {
                    res.send(config.get_status_message("wrong_answers_amount")); return;
                }
            } else {
                let message = config.get_status_message("duplicated_exam_name");
                res.status(message["code"]).send(message);
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





async function update_course_status(student_email: string, course_id: string): Promise<boolean> {
    let find_filter = {_id: new ObjectId(course_id)};
    let exams_amount = await exams_table.findOne(find_filter, {projection: { _id: 1}});

    if (exams_amount === null) {
        return false;
    }

    //TODO: AGREGAR QUE LOS EXAMENES QUE ESTAN CORREGIDOS TIENEN QUE ESTAR PUBLICADOS PARA SER TOMADOS EN CUENTA

    let exams_passed = await exams_table.aggregate(
        [{"$match": {"$expr": {"$eq": ["$_id", new ObjectId(course_id)]}}},
          {"$unwind": {"path": "$exams"}},
          {"$match": 
            {"$expr": {"$eq": ["$exams.is_published", true]}}},
          {"$unwind": {"path": "$exams.students_exams"}},
          {"$match": 
            {"$expr": {"$eq": ["$exams.students_exams.student_email", student_email]}}},
          {"$match": 
            {"$expr": {"$gte": ["$exams.students_exams.mark", PASSING_MARK]}}},
          {"$project": 
            {"_id": 0,
              "exams": "$exams.exam_name"
              }}]).toArray();

    let published_exams = await exams_table.aggregate(
        [{"$match": {"$expr": {"$eq": ["$_id", new ObjectId(course_id)]}}},
          {"$unwind": {"path": "$exams"}},
          {"$match": 
            {"$expr": {"$eq": ["$exams.is_published", true]}}},
          {"$project": 
            {"_id": 0,
              "exams": "$exams.exam_name"
              }}]).toArray();
    if ((published_exams.length === exams_passed.length) && (exams_amount.exams_amount != 0)) {
        let passed_courses = await profiles_table.findOne({email: student_email}, {projection: { _id: 1, "passed_courses": 1 }});
        if (passed_courses === null) {
            return false;
        }
        if (!passed_courses.passed_courses.includes(course_id)) {
            passed_courses.passed_courses.push(course_id);
        }
        await profiles_table.updateOne({email: student_email}, {"$set": {"passed_courses": passed_courses.passed_courses}});
    }
    return true;
}



router.post("/grade_exam", async (req: Request, res: Response) => {
    if (grade_exam_schema(req.body)) {
        try {
            let proffessors = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, {projection: { 
                                                                                                    _id: 0, 
                                                                                                    "creator_email": 1,
                                                                                                    "collaborators": 1,
                                                                                                }});
            if ((req.body.professor_email !== proffessors.creator_email) && (!proffessors.collaborators.includes(req.body.professor_email))) {
                res.send(config.get_status_message("not_a_proffessor")); 
                return;
            }

            let find_filter = {_id: new ObjectId(req.body.course_id), "exams": { "$elemMatch": {"exam_name": req.body.exam_name}}};
            let existing_exam = await exams_table.findOne(find_filter, {projection: { _id: 1, "exams.questions.$": 1 }});
            if (existing_exam === null) {
                res.send(config.get_status_message("non_existent_exam")); return;
            } else {
                let questions = existing_exam.exams[0].questions;
                if (questions.length === req.body.corrections.length) {
                    let answered_exam = await exams_table.aggregate(
                        [{"$match": {"$expr": {"$eq": ["$_id", new ObjectId(req.body.course_id)]}}},
                          {"$unwind": {"path": "$exams"}},
                          {"$match": {"$expr": {"$eq": ["$exams.exam_name", req.body.exam_name]}}},
                          {"$unwind": {"path": "$exams.students_exams"}},
                          {"$match": 
                            {"$expr": {"$eq": ["$exams.students_exams.student_email", req.body.student_email]}}},
                          {"$project": 
                            {"_id": 0,
                              "professors_notes": "$exams.students_exams.professor_notes",
                              "mark": "$exams.students_exams.mark"}}]).toArray();
                    
                    if (answered_exam.length === 1) {
                        let past_mark = answered_exam[0].mark;
                        if (past_mark === NOT_CORRECTED_MARK) {
                            let update_document_query = {"$set": {
                                                                  "exams.$[s].students_exams.$[e].mark": <Number>req.body.mark,
                                                                  "exams.$[s].students_exams.$[e].professors_notes": req.body.corrections,
                                                                }};
                            let array_filter = {arrayFilters: [ {"e.student_email": req.body.student_email}, {"s.exam_name": req.body.exam_name} ], "multi": true};

                            await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, update_document_query, array_filter);

                            if (!await update_course_status(req.body.student_email, req.body.course_id)) {
                                let message = config.get_status_message("unexpected_error");
                                res.status(message["code"]).send(message);
                                return;
                            }
                            res.send(config.get_status_message("exam_graded")); return;
                        } else {
                            res.send(config.get_status_message("exam_already_graded")); return;
                        }

                    } else if (answered_exam.length === 0) {
                            res.send(config.get_status_message("exam_not_completed")); return;
                    } else {
                        let message = config.get_status_message("duplicated_exam_completion");
                        res.status(message["code"]).send(message); return;
                    }
                } else {
                    res.send(config.get_status_message("wrong_corractions_amount")); return;
                }
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


//filter: none, published_ not_published
router.get("/exams/:id/:filter/:user_email", async (req: Request, res:Response) => {
    let id = req.params.id;
    const Id = schema(String); //TODO: SE PODRIA CAMBIAR ESTO A UN SCHEMA QUE CHEQUEE EL LARGO DEL STRING
    if (!Id(id) || (id.length != MONGO_SHORT_ID_LEN && id.length != MONGO_LONG_ID_LEN)) {
        res.send(config.get_status_message("invalid_course_id"));
        return;
    }
    try {
        let course = await courses_table.findOne({"_id": new ObjectId(id)}, 
                                                 {projection: {
                                                    "creator_email": 1,
                                                    "collaborators": 1,
                                                    "students": 1,
                                                 }});

        if (course === null) {
            res.send(config.get_status_message("invalid_course_id"));
            return;
        }                                                 
        if (course.students.includes(req.params.user_email)) {
            req.params.filter = "published";
        } else if ((req.params.user_email !== course.creator_email) && (!course.collaborators.includes(req.params.user_email))) {
            res.send(config.get_status_message("not_from_course"));
            return;
        }
        let query_array: any = [
            {"$match": {"$expr": {"$eq":["$_id", new ObjectId(id)]}}},
            {"$unwind": {"path": "$exams"}}
        ];
    
        if (req.params.filter === "published") {
            query_array.push({"$match": {"$expr": {"$eq": ["$exams.is_published", true]}}});
        } else if (req.params.filter === "not_published") {
            query_array.push({"$match": {"$expr": {"$eq": ["$exams.is_published", false]}}});
        }
        query_array.push({"$project": {
                            "_id": 0, 
                            "exam_name": "$exams.exam_name",
                            "is_published": "$exams.is_published"
                        }});

        let exams = await exams_table.aggregate(query_array).toArray();
        res.send({...config.get_status_message("got_exams_names"), "exams": exams});
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});

//filter: none, graded or not_graded
router.get("/:id/students_exams/:email/:filter", async (req: Request, res:Response) => {
    let id = req.params.id;
    const Id = schema(String); //TODO: SE PODRIA CAMBIAR ESTO A UN SCHEMA QUE CHEQUEE EL LARGO DEL STRING
    if (!Id(id) || (id.length != MONGO_SHORT_ID_LEN && id.length != MONGO_LONG_ID_LEN)) {
        res.send(config.get_status_message("invalid_course_id"));
        return;
    }
    try {
        let course_data = await courses_table.findOne({_id: new ObjectId(id)}, {projection: {
                                                                                    "_id": 0, 
                                                                                    "creator_email": 1,
                                                                                    "collaborators": 1,
                                                                                }});
        if (course_data === null) {
            res.send(config.get_status_message("non_existent_course"));
            return;
        }                                                                            
        if ((course_data.creator_email !== req.params.email) && (!course_data.collaborators.includes(req.params.email))) {
            res.send(config.get_status_message("not_a_proffessor"));
            return;
        }                                                                            
        let exams;

        if (req.params.filter === "none") {
            exams = await exams_table.aggregate(
                [{"$match": {"$expr": {"$eq":["$_id", new ObjectId(id)]}}},
                {"$unwind": {"path": "$exams"}},
                {"$unwind": {"path": "$exams.students_exams"}},
                {"$project": {
                    "_id": 0, 
                    "exam_name": "$exams.exam_name",
                    "student_email": "$exams.students_exams.student_email",
                    "status": "$exams.students_exams.mark"
                }}]).toArray();
            exams.forEach((element:any) => {
                if (element.status === NOT_CORRECTED_MARK) {
                    element.status = "Not graded";
                } else {
                    element.status = "Graded";
                }
            });
        } else if (req.params.filter === "graded") {
            exams = await exams_table.aggregate(
                [{"$match": {"$expr": {"$eq":["$_id", new ObjectId(id)]}}},
                {"$unwind": {"path": "$exams"}},
                {"$unwind": {"path": "$exams.students_exams"}},
                {"$match": {"$expr": {"$ne":["$exams.students_exams.mark", NOT_CORRECTED_MARK]}}},
                {"$project": {
                    "_id": 0, 
                    "exam_name": "$exams.exam_name",
                    "student_email": "$exams.students_exams.student_email",
                }}]).toArray();
        } else if (req.params.filter === "not_graded") {
            exams = await exams_table.aggregate(
                [{"$match": {"$expr": {"$eq":["$_id", new ObjectId(id)]}}},
                {"$unwind": {"path": "$exams"}},
                {"$unwind": {"path": "$exams.students_exams"}},
                {"$match": {"$expr": {"$eq":["$exams.students_exams.mark", NOT_CORRECTED_MARK]}}},
                {"$project": {
                    "_id": 0, 
                    "exam_name": "$exams.exam_name",
                    "student_email": "$exams.students_exams.student_email",
                }}]).toArray();
        } else {
            res.send(config.get_status_message("invalid_args"));
            return;
        }
        res.send({...config.get_status_message("got_exams_names"), "exams": exams});
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});


function is_from_course(user: string, creator_email: string, collaborators: string, students: string): boolean {
    return (user === creator_email) || (collaborators.includes(user)) || (students.includes(user));
}

//projection: questions or completed_exam
router.get("/:id/exam/:email/:exam_name/:projection/:student_email", async (req: Request, res:Response) => {
    let id = req.params.id;
    const Id = schema(String); //TODO: SE PODRIA CAMBIAR ESTO A UN SCHEMA QUE CHEQUEE EL LARGO DEL STRING
    if (!Id(id) || (id.length != MONGO_SHORT_ID_LEN && id.length != MONGO_LONG_ID_LEN)) {
        res.send(config.get_status_message("invalid_course_id"));
        return;
    }
    
    try {
        let course_data = await courses_table.findOne({_id: new ObjectId(id)}, {projection: {
                                                                                "_id": 0, 
                                                                                "creator_email": 1,
                                                                                "collaborators": 1,
                                                                                "students": 1,
                                                                            }});
        if (course_data === null) {
            res.send(config.get_status_message("non_existent_course"));
            return;
        }
        if (!is_from_course(req.params.email, course_data.creator_email, course_data.collaborators, course_data.students)) {
            res.send(config.get_status_message("not_from_course"));
            return;    
        }
        if (req.params.projection === "completed_exam") {
            if (course_data.students.includes(req.params.email) && (req.params.email !== req.params.student_email)) {
                res.send(config.get_status_message("not_your_exam"));
                return;
            }
        }

        let query: any = [{"$match": {"$expr": {"$eq":["$_id", new ObjectId(id)]}}},
                     {"$unwind": {"path": "$exams"}},
                     {"$match": {"$expr": {"$eq":["$exams.exam_name", req.params.exam_name]}}}];
        if (req.params.projection === "questions") {
            if (req.params.student_email !== "none") {
                res.send(config.get_status_message("questions_have_no_students"));
                return;
            }
            query.push({"$project": {
                "_id": 0, 
                "questions": "$exams.questions",
            }});
        } else if (req.params.projection === "completed_exam") {
            let rest_of_query = [
                {"$unwind": {"path": "$exams.students_exams"}},
                {"$match": {"$expr": {"$eq":["$exams.students_exams.student_email", req.params.student_email]}}},
                {"$project": {
                    "_id": 0, 
                    "questions": "$exams.questions",
                    "answers": "$exams.students_exams.answers",
                    "corrections": "$exams.students_exams.professors_notes",
                    "mark": "$exams.students_exams.mark"
                }}
            ];
            query = query.concat(rest_of_query);
        } else {
            res.send(config.get_status_message("invalid_args"));
            return;
        }
        let exam = await exams_table.aggregate(query).toArray();
        if (exam.length === 0) {
            res.send(config.get_status_message("non_existent_exam"));
        } else {
            if (exam[0].mark === NOT_CORRECTED_MARK) {
                exam[0].mark = "Not graded";
                exam[0].corrections = undefined;
            }
            res.send({...config.get_status_message("got_exam"), "exam": exam[0]});
        }
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});


router.post("/add_collaborator", async (req: Request, res: Response) => {
    console.log("Estoy en add collaborator");

    if (add_collaborator_schema(req.body)) {
        try {
            let existing_course = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, 
                    {projection: { "_id": 1, 
                    "collaborators": 1,
                    "creator_email": 1,
                 }});
            let collaborator = await profiles_table.findOne({email: req.body.collaborator_email}, 
                    {projection: { "_id": 1, 
                    "collaborator_courses": 1,
                 }});
            if (existing_course === null) {
                res.send(config.get_status_message("non_existent_course"));
                return;
            }
            if (collaborator === null) {
                res.send(config.get_status_message("non_existent_collaborator"));
                return;
            }
            if (req.body.collaborator_email === existing_course.creator_email) {
                res.send(config.get_status_message("collaborator_is_creator"));
                return;
            }
            if (existing_course.creator_email === req.body.user_email) {
                if (!existing_course.collaborators.includes(req.body.collaborator_email)) {
                    existing_course.collaborators.push(req.body.collaborator_email);
                }
                if (!collaborator.collaborator_courses.includes(req.body.course_id)) {
                    collaborator.collaborator_courses.push(req.body.course_id);
                }
                await courses_table.updateOne({_id: new ObjectId(req.body.course_id)}, {"$set": {collaborators: existing_course.collaborators}});
                await profiles_table.updateOne({email: req.body.collaborator_email}, {"$set": {collaborator_courses: collaborator.collaborator_courses}});
                res.send(config.get_status_message("collaborator_added"));
            } else {
                res.send(config.get_status_message("not_the_creator"));
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


//Returns the emails of the students that completed the received course
router.get("/:id/students/:user_email/:exam_name", async (req: Request, res: Response) => {
    try {
        let existing_course = await courses_table.findOne({_id: new ObjectId(req.params.id)}, 
                {projection: { "_id": 1, 
                "students": 1,
                "collaborators": 1,
                "creator_email": 1,
             }});
        if (existing_course === null) {
            res.send(config.get_status_message("non_existent_course"));
            return;
        }
        if ((existing_course.creator_email === req.params.user_email) || (existing_course.collaborators.includes(req.params.user_email))) {

            if (req.params.exam_name === "none") {
                res.send({...config.get_status_message("got_students_names"), "names": existing_course.students});
                return;
            } else {
                let students = await exams_table.aggregate(
                    [{"$match": {"$expr": {"$eq":["$_id", new ObjectId(req.params.id)]}}},
                    {"$unwind": {"path": "$exams"}},
                    {"$match": {"$expr": {"$eq":["$exams.exam_name", req.params.exam_name]}}},
                    {"$unwind": {"path": "$exams.students_exams"}},
                    {"$project": {
                        "_id": 0, 
                        "student_email": "$exams.students_exams.student_email",
                    }}]).toArray();
                if (students.length === 0) {
                    res.send(config.get_status_message("exam_not_completed")); return;
                } else {
                    let students_names = students.map(function(student: any) {
                        return student.student_email;
                    });
                    res.send({...config.get_status_message("got_students_names"), "names": students_names}); return;
                }
            }
        } else {
            res.send(config.get_status_message("not_the_creator"));
        }
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});



//Returns the emails of the students that completed the received course
router.get("/passing_courses/:user_email", async (req: Request, res: Response) => {
    try {
        let passed_courses = await profiles_table.findOne({email: req.params.user_email}, {projection: {_id: 0, "passed_courses": 1}});
        if (passed_courses === null) {
            res.send(config.get_status_message("non_existent_user"));
            return;
        }
        passed_courses.passed_courses = passed_courses.passed_courses.map(function(course_id: string) {
            return new ObjectId(course_id);
        });
        let passed_courses_names = await courses_table.find({_id: {"$in": passed_courses.passed_courses}}, {projection: {_id: 0, "creator_email": 1, "title": 1}}).toArray();
        res.send({...config.get_status_message("passed_courses"), "passed_courses_names": passed_courses_names});
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});


router.post("/grade_course", async (req: Request, res: Response) => {
    if (grade_course_schema(req.body)) {
        try {
            let existing_course = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, 
                {projection: { "_id": 0, 
                "students": 1,
                "students_grading": 1,
             }});
            if (existing_course === null) {
                res.send(config.get_status_message("non_existent_course"));
                return;
            }
            if (!existing_course.students.includes(req.body.user_email)) {
                res.send(config.get_status_message("not_from_course"));
                return;
            }
            let has_already_commented = false;
            existing_course.students_grading.forEach((grading: CourseGrading) => {
                if (grading.student_email === req.body.user_email) {
                    has_already_commented = true;
                }
            });
            if (!has_already_commented) {
                existing_course.students_grading.push(new CourseGrading(req.body.user_email, req.body.comment, req.body.grade))
                const update = { "$set": {"students_grading": existing_course.students_grading} };
                const options = { "upsert": false };
                await courses_table.updateOne({_id: new ObjectId(req.body.course_id)}, update, options);
                res.send(config.get_status_message("comment_inserted"));
                return;
            } else {
                res.send(config.get_status_message("user_already_commented"));
                return;
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


//Returns the gradings that the students gave the course
router.get("/student_gradings/:id", async (req: Request, res: Response) => {
    try {
        let existing_course = await courses_table.findOne({_id: new ObjectId(req.params.id)}, 
                {projection: { "_id": 0, 
                "students_grading": 1,
             }});
        if (existing_course === null) {
            res.send(config.get_status_message("non_existent_course"));
            return;
        }
        let gradings_cum_sum = 0;
        existing_course.students_grading.forEach((grading: any) => {
            gradings_cum_sum += grading.grade;
        });
        if (existing_course.students_grading.length != 0) {
            let course_average = gradings_cum_sum / existing_course.students_grading.length;
            res.send({...config.get_status_message("data_sent"), "gradings": existing_course.students_grading, "average": course_average});
            return;
        }
        res.send({...config.get_status_message("data_sent"), "gradings": existing_course.students_grading});
        return;
    } catch (err) {
        console.log(err);
        let message = config.get_status_message("unexpected_error");
        res.status(message["code"]).send(message);
    }
});

module.exports = router;