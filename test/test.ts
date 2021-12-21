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
import { create_server } from "../src/server";
import { business_db, courses_table, profiles_table, exams_table } from "../src/db/database"
import { Course } from "../src/models/course"

export const app = create_server(business_db);


//mongo_client.close() //Not needed for now

export function clean_db() {
    courses_table.deleteMany({});
    profiles_table.deleteMany({});
    exams_table.deleteMany({});
}

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
});


