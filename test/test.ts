var assert = require('assert');

describe('Pinger', () =>
{
    describe('test addNums(x, y)', () =>
    {
        it('should add nums', () =>
        {
            assert.equal(4, 4);
        });
    });
});

import request from "supertest";
import {create_server, connect_to_database} from "../src/server";
import {Course} from "../src/models/course"

let mongo_client = connect_to_database();
const app = create_server(mongo_client.db(<string>"Business"));
mongo_client.close() //Not needed for now

describe("server checks", function () {
  it("server instantiated without error", function (done) {
    request(app).get("/").expect(200, done);
  });

  it("ping returns pong", function (done) {
    request(app).get("/ping").expect(200, done);
  });

  it("status returns ok", function (done) {
    request(app).get("/status").expect(200, done);
  });

  it("valid course input", function() {
    const request = {"email":"hola@gmail.com","title":"curso con imagenes y videos","description":"curso", 
    "total_exams":1, "hashtags":["si","no"],"images":["urlimagen1"],
    "videos":[{"name":"video1","url":"url1"},{"name":"video2","url":"url2"},{"name":"video3","url":"url3"}],
    "country":"Argentina","subscription_type":"Gold","course_type":"Art"};
    let course = new Course(request);
  });
});


