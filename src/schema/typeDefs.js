const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar Date

  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
    events: [Event!]
    vouchers: [Voucher!]
  }

  type Event {
    id: ID!
    name: String!
    description: String
    maxQuantity: Int!
    issuedCount: Int!
    availableQuantity: Int!
    isFullyIssued: Boolean!
    isActive: Boolean!
    createdAt: Date!
    updatedAt: Date!
    editingBy: String
    editLockAt: Date
    vouchers: [Voucher!]
  }

  type Voucher {
    id: ID!
    eventId: ID!
    event: Event!
    code: String!
    issuedTo: String!
    isUsed: Boolean!
    createdAt: Date!
    updatedAt: Date!
  }

  enum UserRole {
    USER
    ADMIN
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    # User queries
    me: User
    users: [User!]!
    user(id: ID!): User
    userByEmail(email: String!): User

    # Event queries
    events(
      limit: Int
      offset: Int
      isActive: Boolean
      search: String
    ): [Event!]!
    event(id: ID!): Event
    activeEvents(limit: Int): [Event!]!

    # Voucher queries
    vouchers(
      limit: Int
      offset: Int
      eventId: ID
      issuedTo: String
      isUsed: Boolean
    ): [Voucher!]!
    voucher(id: ID!): Voucher
    voucherByCode(code: String!): Voucher
    eventVouchers(eventId: ID!): [Voucher!]!
    userVouchers(issuedTo: String!): [Voucher!]!
  }

  type Mutation {
    # Auth mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # User mutations
    updateProfile(input: UpdateProfileInput!): User!
    changePassword(input: ChangePasswordInput!): Boolean!

    # Event mutations
    createEvent(input: CreateEventInput!): Event!
    updateEvent(id: ID!, input: UpdateEventInput!): Event!
    deleteEvent(id: ID!): Boolean!
    activateEvent(id: ID!): Event!
    deactivateEvent(id: ID!): Event!
    lockEventForEditing(id: ID!): Event!
    unlockEvent(id: ID!): Event!

    # Voucher mutations
    createVoucher(input: CreateVoucherInput!): Voucher!
    updateVoucher(id: ID!, input: UpdateVoucherInput!): Voucher!
    deleteVoucher(id: ID!): Boolean!
    useVoucher(id: ID!): Voucher!
    issueVoucherToUser(input: IssueVoucherInput!): Voucher!
  }

  input RegisterInput {
    email: String!
    password: String!
    name: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateProfileInput {
    name: String
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  input CreateEventInput {
    name: String!
    description: String
    maxQuantity: Int!
  }

  input UpdateEventInput {
    name: String
    description: String
    maxQuantity: Int
  }

  input CreateVoucherInput {
    eventId: ID!
    code: String!
    issuedTo: String!
  }

  input UpdateVoucherInput {
    code: String
    issuedTo: String
  }

  input IssueVoucherInput {
    eventId: ID!
    issuedTo: String!
  }
`;

module.exports = typeDefs;
