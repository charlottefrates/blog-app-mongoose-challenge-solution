const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the should syntax available throughout
// this module
const should = chai.should();

const {
     BlogPost
} = require('../models');
const {
     app,
     runServer,
     closeServer
} = require('../server');
const {
     TEST_DATABASE_URL
} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
     console.info('seeding restaurant data');
     const seedData = [];

     for (let i = 1; i <= 10; i++) {
          seedData.push(generateBlogData());
     }
     // this will return a promise
     return BlogPost.insertMany(seedData);
};

function generateBlogData() {
     return {
          author: {
               firstName: faker.name.firstName(),
               lastName: faker.name.lastName()
          },
          title: faker.lorem.words(),
          content: faker.lorem.paragraph(),
     };
};

function tearDownDb() {
     console.warn('Deleting database');
     return mongoose.connection.dropDatabase();
}

describe('Blog API resource', function() {

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
                         console.log(_res, "RES");
                         res = _res;
                         res.should.have.status(200);
                         // otherwise our db seeding didn't work
                         res.body.should.have.length.of.at.least(1);
                         // check how many restaurants there are in db
                         return BlogPost.count();
                    })
                    //uses value returned by blog.count in argument
                    .then(function(count) {
                         res.body.should.have.length.of(count);
                    });
          });

          it('should return blogs with right fields', function() {
               // Strategy: Get back all blogs, and ensure they have expected keys
               let resBlog;
               return chai.request(app)
                    .get('/posts')
                    .then(function(res) {
                         res.should.have.status(200);
                         res.should.be.json;
                         res.body.should.be.a('array');
                         res.body.should.have.length.of.at.least(1);

                         res.body.forEach(function(blog) {
                              blog.should.be.a('object');
                              blog.should.include.keys(
                                   'id', 'author', 'title', 'content', 'created');
                         });

                         resBlog = res.body[0];
                         //looks for documents in restaurant collection
                         return BlogPost.findById(resBlog.id);
                    })
                    .then(function(posts) {
                         resBlog.author.should.equal(posts.authorName);
                         resBlog.title.should.equal(posts.title);
                         resBlog.content.should.equal(posts.content);
                    });
          });
     });

     describe('POST endpoint', function() {
          // strategy: make a POST request with data,
          // then prove that the post we get back has
          // right keys, and that `id` is there (which means
          // the data was inserted into db)
          it('should add a new blog post', function() {

               const newBlog = generateBlogData();

               return chai.request(app)
                    .post('/posts')
                    .send(newBlog)
                    .then(function(res) {
                         res.should.have.status(201);
                         res.should.be.json;
                         res.body.should.be.a('object');
                         res.body.should.include.keys(
                              'id', 'title', 'content', 'author', 'created');
                         res.body.title.should.equal(newBlog.title);
                         // cause Mongo should have created id on insertion
                         res.body.id.should.not.be.null;
                         res.body.author.should.equal(
                              `${newBlog.author.firstName} ${newBlog.author.lastName}`);
                         res.body.content.should.equal(newBlog.content);
                         return BlogPost.findById(res.body.id);
                    })
                    .then(function(post) {
                         post.title.should.equal(newBlog.title);
                         post.content.should.equal(newBlog.content);
                         post.author.firstName.should.equal(newBlog.author.firstName);
                         post.author.lastName.should.equal(newBlog.author.lastName);
                    });
          });
     });

     describe('PUT endpoint', function() {

          // strategy:
          //  1. Get an existing post from db
          //  2. Make a PUT request to update that post
          //  3. Prove post returned by request contains data we sent
          //  4. Prove post in db is correctly updated
          it('should update fields you send over', function() {
               const updateData = {
                    title: 'cats cats cats',
                    content: 'dogs dogs dogs',
                    author: {
                         firstName: 'foo',
                         lastName: 'bar'
                    }
               };

               return BlogPost
                    .findOne()
                    .exec()
                    .then(post => {
                         updateData.id = post.id;

                         return chai.request(app)
                              .put(`/posts/${post.id}`)
                              .send(updateData);
                    })
                    .then(res => {
                         res.should.have.status(201);
                         res.should.be.json;
                         res.body.should.be.a('object');
                         res.body.title.should.equal(updateData.title);
                         res.body.author.should.equal(
                              `${updateData.author.firstName} ${updateData.author.lastName}`);
                         res.body.content.should.equal(updateData.content);

                         return BlogPost.findById(res.body.id).exec();
                    })
                    .then(post => {
                         post.title.should.equal(updateData.title);
                         post.content.should.equal(updateData.content);
                         post.author.firstName.should.equal(updateData.author.firstName);
                         post.author.lastName.should.equal(updateData.author.lastName);
                    });
          });
     });

     describe('DELETE endpoint', function() {
          // strategy:
          //  1. get a post
          //  2. make a DELETE request for that post's id
          //  3. assert that response has right status code
          //  4. prove that post with the id doesn't exist in db anymore
          it('should delete a post by id', function() {

               let post;

               return BlogPost
                    .findOne()
                    .exec()
                    .then(_post => {
                         post = _post;
                         return chai.request(app).delete(`/posts/${post.id}`);
                    })
                    .then(res => {
                         res.should.have.status(204);
                         return BlogPost.findById(post.id);
                    })
                    .then(_post => {
                         // when a variable's value is null, chaining `should`
                         // doesn't work. so `_post.should.be.null` would raise
                         // an error. `should.be.null(_post)` is how we can
                         // make assertions about a null value.
                         should.not.exist(_post);
                    });
          });
     });



});