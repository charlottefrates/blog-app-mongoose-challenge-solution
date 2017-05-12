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

function seedBlogData() {
  console.info('seeding restaurant data');
  const seedData = [];

  for (let i=1; i<=10; i++) {
    seedData.push(generateBlogData());
  }
  // this will return a promise
  return BlogPost.insertMany(seedData);
}

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

describe ('Blog API resource',function(){

      before(function() {
        return runServer(TEST_DATABASE_URL);
      });

      beforeEach(function() {
        return seedBlogData();
      });

      // zeroes out the db after each test has run
      afterEach(function() {
        return tearDownDb();
      });

      // ensures that if other test odules run after this they wont get an error upon restart
      after(function() {
        return closeServer();
      });


});
