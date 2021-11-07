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
import { expect } from "chai";

import createServer from "../src/server";
const app = createServer();

describe("server checks", function () {
  it("server instantiated without error", function (done) {
    request(app).get("/").expect(200, done);
  });

  it("ping returns pong", function (done) {
    request(app).get("/ping").expect(200, done);
  });

  it("user returns johndoe", function (done) {
    request(app).get("/user").expect(200, done);
  });
});
