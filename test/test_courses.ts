import request from "supertest";
import { app, clean_db } from "./test"
import { Course } from "../src/models/course"
var assert = require('assert');

const art_gold_course = {
  email: "hola@gmail.com",
  title:"curso con imagenes y videos",
  description: "curso",
  total_exams: 1,
  hashtags: ["si","no"],
  images: ["urlimagen1"],
  videos: [
    { name: "video1", url: "url1" },
    { name: "video2", url: "url2" },
    { name: "video3", url: "url3"}
  ],
  country: "Argentina",
  subscription_type: "Gold",
  course_type:"Art"
}

const programming_free_course = {
  email: "hola2@gmail.com",
  title:"curso de programacion",
  description: "curso",
  total_exams: 1,
  hashtags: ["si","no"],
  images: ["urlimagen1"],
  videos: [
    { name: "video1", url: "url1" },
    { name: "video2", url: "url2" },
    { name: "video3", url: "url3"}
  ],
  country: "Argentina",
  subscription_type: "Free",
  course_type:"Programming"
}

describe("course endpoints", function () {
    this.timeout(7000);
    beforeEach(function() {
        clean_db();
    });

    it("creates a new course", function (done) {
      request(app)
        .post("/courses/create")
        .send(art_gold_course)
        .expect(200)
        .then((res) => {
          assert(res.statusCode === 200);
          assert(res.body.message == "course succesfully created");
          done();
      }).catch(done);
    });

    it("gets all courses", function (done) {
        const client = request(app);
        client.post("/courses/create").send(art_gold_course).end(function() {
            client.post("/courses/create").send(programming_free_course).end(function() {
                client
                .get("/courses/organized/none/none/true")
                .expect(200)
                .then((res) => {
                    assert(res.body.courses.length === 2);
                    assert(res.body.courses[0]['title'] === 'curso con imagenes y videos');
                    assert(res.body.courses[0]['course_type'] === 'Art');
                    assert(res.body.courses[1]['course_type'] === 'Programming');
                    done();
                }).catch(done);
            });
        });
    });

    it("gets courses filtered by course type", function (done) {
        const client = request(app);
        client.post("/courses/create").send(art_gold_course).end(function() {
            client.post("/courses/create").send(programming_free_course).end(function() {
                client
                .get("/courses/organized/Art/none/true")
                .expect(200)
                .then((res) => {
                    assert(res.body.courses.length === 1);
                    assert(res.body.courses[0]['title'] === 'curso con imagenes y videos');
                    assert(res.body.courses[0]['course_type'] === 'Art');
                    done();
                }).catch(done);
            });
        });
    });

    it("gets course data", function (done) {
        const client = request(app);
        client.post("/courses/create").send(art_gold_course).end(function(err, res) {
           const course_id = res.body.id;
           client
            .get(`/courses/data/${course_id}/example@mail.com/admin`)
            .expect(200)
            .then((res) => {
                assert(res.body.course['_id'] === course_id);
                assert(res.body.course.title === "curso con imagenes y videos");
                assert(res.body.course.course_type === "Art");
                assert(res.body.course.subscription_type === "Gold");
                done();
            }).catch(done);
        });
    });

    it("gets course data", function (done) {
        const client = request(app);
        client.post("/courses/create").send(art_gold_course).end(function(err, res) {
           const course_id = res.body.id;
           let updated_course = JSON.parse(JSON.stringify(art_gold_course));
           updated_course.id = course_id;
           updated_course.title = "This is an Art course";
           updated_course.description = "You will learn, surrealism, vanguardism, etc";
           client
            .put("/courses/update")
            .send(updated_course)
            .expect(200)
            .end(function(err, res) {
                client
                    .get(`/courses/data/${course_id}/example@mail.com/admin`)
                    .then( (res) => {
                        assert(res.body.course['_id'] === course_id);
                        assert(res.body.course.title === "This is an Art course");
                        assert(res.body.course.description === "You will learn, surrealism, vanguardism, etc");
                        assert(res.body.course.course_type === "Art");
                        assert(res.body.course.subscription_type === "Gold");
                        done();
                    }).catch(done);
            });
        });
    });

    it("creates an exam", function (done){
        const client = request(app);
        client.post("/courses/create").send(art_gold_course).end(function(err, res) {
            const course_id = res.body.id;
            const exam = {
                course_id: course_id,
                questions: ["q1", "q2", "q3"],
                exam_name: "First exam",
                exam_creator_email: art_gold_course.email
            }
            client.post("/courses/create_exam").send(exam).expect(200)
            .then( (res) => {
                assert(res.body.status === "ok");
                assert(res.body.message === "exam succesfully created");
                done();
            }).catch(done);
        });
    });

    it("publishes an exam", function (done){
        const client = request(app);
        client.post("/courses/create").send(art_gold_course).end(function(err, res) {
            const course_id = res.body.id;
            const exam = {
                course_id: course_id,
                questions: ["q1", "q2", "q3"],
                exam_name: "First exam",
                exam_creator_email: art_gold_course.email
            }
            client.post("/courses/create_exam").send(exam).expect(200).end(function(err, res) {
                const exam_to_publish = {
                    course_id: course_id,
                    exam_name: "First exam",
                    exam_creator_email: art_gold_course.email
                }
                client.post("/courses/publish_exam").send(exam_to_publish).expect(200)
                .then((res) => {
                    assert(res.body.status === "ok");
                    assert(res.body.message === "exam published");
                    done();
                }).catch(done);
            });
        });
    });

    it("edits an exam", function (done){
        const client = request(app);
        client.post("/courses/create").send(art_gold_course).end(function(err, res) {
            const course_id = res.body.id;
            const exam = {
                course_id: course_id,
                questions: ["q1", "q2", "q3"],
                exam_name: "First exam",
                exam_creator_email: art_gold_course.email
            }
            client.post("/courses/create_exam").send(exam).end(function(err, res) {
                let exam_to_edit = JSON.parse(JSON.stringify(exam));
                exam_to_edit.questions = ["q1", "q2", "q3", "q4", "q5"];
                client.post("/courses/edit_exam").send(exam_to_edit).expect(200)
                .then((res) => {
                    assert(res.body.status === "ok");
                    assert(res.body.message === "exam edited");
                    done();
                }).catch(done);
            });
        });
    });
});
