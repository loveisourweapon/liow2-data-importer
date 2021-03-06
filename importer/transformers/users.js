var _ = require('lodash');
var async = require('async');

var name = 'users';

module.exports = {
  name: name,

  dataIn: function __dataIn(mysql, done) {
    var query = 'SELECT u.email, u.name, u.group_id AS admin, u.created, u.modified, ' +
      'c.code as country, m.name as groups, ' +
      'IF(u.group_id = 1, TRUE, FALSE) AS superAdmin, ' +
      'IF(u.activated = 1, TRUE, FALSE) AS activated ' +
      'FROM `users` AS u ' +
      'INNER JOIN `testimonies` AS t ON t.user_id = u.id ' +
      'LEFT JOIN `countries` AS c ON u.country_id = c.id ' +
      'LEFT JOIN `ministries` AS m ON u.ministry_id = m.id ' +
      'WHERE u.activated = TRUE ' +
      'GROUP BY u.id ' +
      'ORDER BY u.id';

    mysql.query(query, function __query(err, users) {
      if (err) { return done(err); }

      done(null, users);
    });
  },

  transform: function __transform(users, mysql, mongodb, done) {
    async.waterfall([
      function(done) {
        mongodb.collection('countries').find({}, { _id: true, code: true }).toArray(done);
      },
      function (countries, done) {
        async.map(users, function(user, done) {
          var names = user.name.split(' ');
          if (names[0]) user.firstName = names[0];
          if (names[1]) user.lastName = names[1];
          delete user.name;

          user.country = _.find(countries, ['code', user.country.toUpperCase()])._id;
          user.groups = [user.groups];
          user.superAdmin = Boolean(user.superAdmin);

          delete user.activated;
          if (user.created.valueOf() === user.modified.valueOf()) {
            delete user.modified;
          }

          done(null, user);
        }, done);
      }
    ], done);
  },

  dataOut: function __dataOut(users, mongodb, done) {
    async.waterfall([
      function(done) {
        mongodb.collection(name, function __collection(err, collection) {
          if (err) { return done(err); }
          done(null, collection);
        });
      },
      function(collection, done) {
        collection.deleteMany({}, function __deleteMany(err) {
          if (err) { return done(err); }
          done(null, collection);
        });
      },
      function(collection, done) {
        collection.insertMany(users, null, function __insertMany(err, result) {
          if (err) { return done(err); }
          done(null, result);
        });
      }
    ], done);
  }
};
