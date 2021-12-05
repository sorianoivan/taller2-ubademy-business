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
import { business_db } from "../index"
import { courses_table } from "../index"
import { exams_table } from "../index"
import { Exam } from "../models/exam"
import { CompletedExam } from "../models/completed_exam";




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
        let course: Course = new Course(req.body);
        console.log(course);//To debug
        await courses_table.insertOne(course);
        console.log("Course succesfully inserted");

        //TODO: TAL VEZ NO HACE FALTA HACER ESTE FIND PORQUE INSERT YA TE DEVUELVE EL ID, SE PUEDE CAMBIAR
        let found_course = await courses_table.findOne({creator_email: course.creator_email, title: course.title}, {projection: {_id: 1}});
        if (found_course === undefined) {
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


router.post("/create_exam", async (req: Request, res: Response) => {
    if (create_exam_schema(req.body) && (req.body.questions.length !== 0)) {
        try {
            let course_doc = await courses_table.findOne({_id: new ObjectId(req.body.course_id)}, {projection: { "total_exams": 1 }});
            let exams_doc = await exams_table.findOne({_id: new ObjectId(req.body.course_id)}, {projection: { "exams_amount": 1 }});

            // TODO: AGREGAR LOGICA DE CHEQUEO DE QUE EL USUARIO QUE CREA EL CURSO ES PROFESOR O COLABORADOR DEL CURSO

            if (course_doc === undefined) {
                res.send(config.get_status_message("course_not_found"));
            } else if (exams_doc === undefined) {
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
            // TODO: AGREGAR LOGICA DE CHEQUEO DE QUE EL USUARIO QUE CREA EL CURSO ES PROFESOR O COLABORADOR DEL CURSO

            let existing_exam = await exams_table.findOne({_id: new ObjectId(req.body.course_id), "exams.exam_name": req.body.exam_name}, {projection: { _id: 1 }});
            if (existing_exam === null) {
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
            // TODO: AGREGAR LOGICA DE CHEQUEO DE QUE EL USUARIO QUE EDITA EL CURSO ES PROFESOR O COLABORADOR DEL CURSO

            //let existing_exam = await exams_table.findOne({_id: new ObjectId(req.body.course_id), "exams.exam_name": req.body.exam_name}, {projection: { _id: 1 }});
            let existing_exam = await exams_table.aggregate([
                {"$match": {"$expr": {"$eq": ["$_id", new ObjectId(req.body.course_id)]}}},
                {"$unwind": {"path": "$exams"}},
                {"$match": {"$expr": {"$eq": ["$exams.exam_name", req.body.exam_name]}}},
                {"$project": {"is_published": "$exams.is_published"}}
            ]);
            if (existing_exam.length === 0) {
                res.send(config.get_status_message("non_existent_exam"));
                return;
            } else {
                // let update_document_query = {"$set": {
                //     "exams.$[s].is_published": true,
                //   }};
                // let array_filter = {arrayFilters: [ {"s.exam_name": req.body.exam_name} ], "multi": true};
                // await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, update_document_query, array_filter);
                // res.send(config.get_status_message("exam_published"));

                if (existing_exam[0].is_published !== true) {
                    let update_document_query = {"$set": {
                        "exams.$[s].questions": req.body.questions,
                      }};
                    let array_filter = {arrayFilters: [ {"s.exam_name": req.body.exam_name} ], "multi": true};
                    await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, update_document_query, array_filter);
                    res.send(config.get_status_message("exam_published"));
                } else {
                    res.send(config.get_status_message("exam_already_published"));
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


router.post("/complete_exam", async (req: Request, res: Response) => {
    if (complete_exam_schema(req.body)) {
        try {
            // TODO: AGREGAR LOGICA DE CHEQUEO DE QUE EL USUARIO QUE COMPLETA EL EXAMEN ES ALUMNO DEL CURSO
            
            let existing_exam = await exams_table.aggregate(
                        [{"$match": {"$expr": {"$eq": ["$_id", new ObjectId(req.body.course_id)]}}},
                          {"$unwind": {"path": "$exams"}},
                          {"$match": {"$expr": {"$eq": ["$exams.exam_name", req.body.exam_name]}}},
                          {"$project": 
                            {"_id": 0,
                              "questions": "$exams.questions"}}]).toArray();

            if (existing_exam.length === 0) {
                res.send(config.get_status_message("non_existent_exam")); return;
            } else if (existing_exam.length === 1) {
                let questions = existing_exam[0].questions;
                if (questions.length === req.body.answers.length) {
                    let answered_exam_query = {_id: new ObjectId(req.body.course_id),
                        "exams": { "$elemMatch": {"exam_name": req.body.exam_name,
                        "students_exams": {"$elemMatch": {"student_email": req.body.student_email}}}}};

                    //TODO: VER SI PUEDO VOLAR ESTA QUERY, DEBERIA PODER PEDIR TODO SOLO CON LA DE ARRIBA   
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

router.post("/grade_exam", async (req: Request, res: Response) => {
    if (grade_exam_schema(req.body)) {
        try {
            // TODO: VER QUE EL QUE CORRIGE EL EXAMEN SEA DOCENTE O COLABORADOR DEL CURSO            
 
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

                            //TODO: AGREGAR CHEQUEO DE QUE SI EL EXAMEN ESTA APROBADO (req.body.mark) HAY QUE FIJARSE SI EL ALUMNO AL QUE SE CORRIGIO APROBO TODOS LOS EXAMENES,
                            //SI APROBO TODOS ENTONCES SE GUARDA EN SU PERFIL/OTRO LADO QUE APROBO EL CURSO

                            let update_document_query = {"$set": {
                                                                  "exams.$[s].students_exams.$[e].mark": <Number>req.body.mark,
                                                                  "exams.$[s].students_exams.$[e].professors_notes": req.body.corrections,
                                                                }};
                            let array_filter = {arrayFilters: [ {"e.student_email": req.body.student_email}, {"s.exam_name": req.body.exam_name} ], "multi": true};

                            await exams_table.updateOne({_id: new ObjectId(req.body.course_id)}, update_document_query, array_filter);
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


module.exports = router;