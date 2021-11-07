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
    let course = new Course("mail@mail.com","titulo","descripcion",["h1","h2"],
                            "argentina", "tipo", "subscripcion");
  });
});


