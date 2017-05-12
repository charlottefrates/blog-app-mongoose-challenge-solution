const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function generateBlogData(){
     return{
          author: {
            firstName: faker.Random.first_name(),
            lastName: faker.Random.last_name()
          },
          title: faker.lorem.words(),
          content: faker.lorem.paragraph(),
          created: faker.date.recent()
     };
};

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}
