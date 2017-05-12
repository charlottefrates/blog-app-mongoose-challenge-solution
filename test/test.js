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
};

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

      describe('GET endpoint', function() {

           it('should return all existing blog posts', function() {
             // strategy:
             //    1. get back all restaurants returned by by GET request to `/restaurants`
             //    2. prove res has right status, data type
             //    3. prove the number of restaurants we got back is equal to number
             //       in db.
             //
             // need to have access to mutate and access `res` across
             // `.then()` calls below, so declare it here so can modify in place
             let res;
             // this line of code days that re are returning a PROMISE
             return chai.request(app)
               .get('/posts')
               .then(function(_res) {
                 // so subsequent .then blocks can access resp obj.
                 res = _res;
                 res.should.have.status(200);
                 // otherwise our db seeding didn't work
                 res.body.posts.should.have.length.of.at.least(1);
                 // check how many restaurants there are in db
                 return BlogPost.count();
               })
               //uses value returned by restaurant.count in argument
               .then(function(count) {
                 res.body.posts.should.have.length.of(count);
               });
           });
         });


});
