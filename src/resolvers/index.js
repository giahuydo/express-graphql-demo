const authResolvers = require('./auth');
const userResolvers = require('./user');
const eventResolvers = require('./event');
const voucherResolvers = require('./voucher');

const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...userResolvers.Query,
    ...eventResolvers.Query,
    ...voucherResolvers.Query
  },

  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...eventResolvers.Mutation,
    ...voucherResolvers.Mutation
  },

  User: {
    ...userResolvers.User
  },

  Event: {
    ...eventResolvers.Event
  },

  Voucher: {
    ...voucherResolvers.Voucher
  }
};

module.exports = resolvers;
