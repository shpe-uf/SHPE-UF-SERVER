const { gql } = require("graphql-tag");

module.exports = gql`
  ### MAIN MODEL TYPES ###

  type User {
    id: ID!
    firstName: String!
    lastName: String!
    photo: String!
    major: String!
    year: String!
    graduating: String!
    country: String!
    ethnicity: String!
    sex: String!
    username: String!
    email: String!
    password: String!
    createdAt: String!
    updatedAt: String!
    points: Int!
    fallPoints: Int!
    springPoints: Int!
    summerPoints: Int!
    fallPercentile: Int!
    springPercentile: Int!
    summerPercentile: Int!
    permission: String!
    listServ: Boolean!
    events: [Event]!
    tasks: [Task]!
    bookmarkedTasks: [String]!
    token: String!
    message: String!
    confirmed: Boolean!
    bookmarks: [String]!
    classes: [String]
    internships: [String]
    socialMedia: [String]
  }

  type Event {
    id: ID!
    name: String!
    code: String!
    category: String!
    points: Int!
    attendance: Int!
    expiration: String!
    request: Boolean!
    semester: String!
    createdAt: String!
    users: [User]!
  }

  type Task {
    id: ID!
    name: String!
    startDate: String!
    endDate: String!
    description: String!
    points: Int!
    attendance: Int!
    semester: String!
    createdAt: String!
    users: [User]
  }

  type Resource {
    id: ID!
    title: String!
    link: String!
    description: String
    image: String!
    createdAt: String!
    podcast: Boolean!
  }

  type Corporation {
    id: ID!
    name: String!
    logo: String!
    slogan: String!
    majors: [String!]!
    industries: [String!]!
    overview: String!
    mission: String!
    goals: String!
    businessModel: String!
    newsLink: String!
    applyLink: String!
    academia: Boolean!
    govContractor: Boolean!
    nonProfit: Boolean!
    visaSponsor: Boolean!
    shpeSponsor: Boolean!
    industryPartnership: Boolean!
    fallBBQ: Boolean!
    springBBQ: Boolean!
    nationalConvention: Boolean!
  }

  type Request {
    id: ID!
    name: String!
    type: String!
    points: String!
    firstName: String!
    lastName: String!
    username: String!
    createdAt: String!
  }

  type Alumni {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    undergrad: Undergrad!
    grad: Grad!
    employer: String!
    position: String!
    location: Location
    coordinates: Coordinates!
    linkedin: String!
  }

  type Reimbursement {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    studentId: Int!
    address: String!
    company: String!
    event: String!
    description: String!
    reimbursed: String!
    amount: String!
    ufEmployee: Boolean!
    receiptPhoto: String!
    eventFlyer: String!
  }

  type Rentable {
    item: String!
    quantity: Int!
    level: Int!
    description: String
    link: String
    renters: [String]!
    category: String!
    image: String!
  }

  type Receipt {
    id: ID!
    username: String!
    item: String!
    quantity: Int!
    email: String!
    dateCheckedOut: String!
    datePickedUp: String
    dateClosed: String
    deleted: Boolean
  }

  type ContactRequest {
    firstName: String!
    lastName: String!
    email: String!
    messageType: String!
    message: String!
  }

  ### AUXILIARY TYPES ###
  type StatData {
    _id: String!
    value: Int!
  }

  type Token {
    token: String!
  }

  type Undergrad {
    university: String!
    year: Int!
    major: String!
  }

  type Grad {
    university: String!
    year: Int!
    major: String!
  }

  type Location {
    city: String!
    state: String!
    country: String!
  }

  type Coordinates {
    latitude: Float!
    longitude: Float!
  }

  ### QUERY AND MUTATION INPUTS ###

  input RegisterInput {
    firstName: String!
    lastName: String!
    major: String!
    year: String!
    graduating: String!
    country: String!
    ethnicity: String!
    sex: String!
    username: String!
    email: String!
    password: String!
    confirmPassword: String!
    listServ: String!
  }

  input CreateEventInput {
    name: String!
    code: String!
    category: String!
    points: String!
    expiration: String!
    request: String!
  }

  input CreateTaskInput {
    name: String!
    startDate: String!
    endDate: String!
    description: String!
    points: Int!
  }

  input CreateResourceInput {
    title: String!
    description: String
    link: String!
    image: String
    podcast: Boolean!
  }

  input TransactionData {
    item: String!
    username: String!
    numberOfItems: Int!
    email: String!
  }

  input CreateCorporationInput {
    name: String!
    logo: String!
    slogan: String!
    majors: [String!]!
    industries: [String!]!
    overview: String!
    mission: String!
    goals: String!
    businessModel: String!
    newsLink: String!
    applyLink: String!
    academia: String!
    govContractor: String!
    nonProfit: String!
    visaSponsor: String!
    shpeSponsor: String!
    industryPartnership: String!
    fallBBQ: String!
    springBBQ: String!
    nationalConvention: String!
  }

  input EditCorporationInput {
    id: ID!
    name: String!
    logo: String!
    slogan: String!
    majors: [String!]!
    industries: [String!]!
    overview: String!
    mission: String!
    goals: String!
    businessModel: String!
    newsLink: String!
    applyLink: String!
    academia: String!
    govContractor: String!
    nonProfit: String!
    visaSponsor: String!
    shpeSponsor: String!
    industryPartnership: String!
    fallBBQ: String!
    springBBQ: String!
    nationalConvention: String!
  }

  input RedeemPointsInput {
    code: String!
    username: String!
    guests: Int!
  }

  input bookmarkTaskInput {
    name: String!
    username: String!
  }

  input unBookmarkTaskInput {
    name: String!
    username: String!
  }

  input RedeemTasksPointsInput {
    name: String!
    username: String!
  }

  input ApproveRejectRequestInput {
    username: String!
    name: String!
    type: String!
  }

  input ManualInputInput {
    username: String!
    eventName: String!
  }

  input ManualTaskInputInput {
    username: String!
    taskName: String!
  }

  input RegisterAlumniInput {
    firstName: String!
    lastName: String!
    email: String!
    undergrad: UndergradInput!
    grad: GradInput!
    employer: String!
    position: String!
    location: LocationInput!
    linkedin: String!
  }

  input EditUserProfileInput {
    email: String!
    firstName: String!
    lastName: String!
    photo: String!
    major: String!
    year: String!
    graduating: String!
    country: String!
    ethnicity: String!
    sex: String!
    classes: [String]
    internships: [String]
    socialMedia: [String]
  }

  input EditUpdatedAtInput {
    email: String!
    updatedAt: String!
  }

  input ReimbursementInput {
    firstName: String!
    lastName: String!
    email: String!
    studentId: String!
    address: String!
    company: String!
    event: String!
    description: String!
    reimbursed: String!
    amount: String!
    ufEmployee: String!
    receiptPhoto: String!
    eventFlyer: String!
    execute: Boolean!
  }

  ### AUXILIARY INPUTS ###
  input UndergradInput {
    university: String!
    year: String!
    major: String!
  }

  input GradInput {
    university: String!
    year: String!
    major: String!
  }

  input LocationInput {
    city: String!
    state: String!
    country: String!
  }

  ### QUERIES LIST ###

  type Query {
    getUsers: [User]
    getUser(userId: ID!): User
    getEvents: [Event]
    getEventsReversed: [Event]
    getTasks: [Task]
    getResources: [Resource]
    getRequests: [Request]
    getMatches(username: String!): [User]
    getCorporations: [Corporation]
    getMajorStat: [StatData]
    getCountryStat: [StatData]
    getYearStat: [StatData]
    getSexStat: [StatData]
    getEthnicityStat: [StatData]
    getAlumnis: [Alumni]
    getReimbursements: [Reimbursement]
    getInventory: [Rentable]
    getItem(item: String): Rentable
    getReceipts: [Receipt]
  }

  ### MUTATIONS LIST ###

  type Mutation {
    register(registerInput: RegisterInput): User!
    login(username: String!, password: String!, remember: String!): User!
    createCorporation(
      createCorporationInput: CreateCorporationInput
    ): [Corporation]
    editCorporation(editCorporationInput: EditCorporationInput): Corporation!
    deleteCorporation(corporationId: ID!): [Corporation]!
    createEvent(createEventInput: CreateEventInput): [Event]
    redeemPoints(redeemPointsInput: RedeemPointsInput): User!
    createTask(createTaskInput: CreateTaskInput): Task!
    createResource(createResourceInput: CreateResourceInput): [Resource]
    deleteResource(resourceId: ID!): [Resource!]
    bookmarkTask(bookmarkTaskInput: bookmarkTaskInput): User!
    unBookmarkTask(unBookmarkTaskInput: unBookmarkTaskInput): User!
    redeemTasksPoints(redeemTasksPointsInput: RedeemTasksPointsInput): User!
    approveRequest(
      approveRejectRequestInput: ApproveRejectRequestInput
    ): [Request]
    rejectRequest(
      approveRejectRequestInput: ApproveRejectRequestInput
    ): [Request]
    manualInput(manualInputInput: ManualInputInput): [Event]
    deleteEvent(eventName: String!): [Event]
    removeUserFromEvent(manualInputInput: ManualInputInput): Event
    manualTaskInput(manualTaskInputInput: ManualTaskInputInput): Task
    removeUserFromTask(manualTaskInputInput: ManualTaskInputInput): Task
    deleteTask(taskId: ID!): [Task]
    forgotPassword(email: String!): User!
    resetPassword(
      password: String!
      confirmPassword: String!
      token: String!
    ): Token!
    confirmUser(id: String!): User!
    bookmark(company: String!, username: String!): User!
    deleteBookmark(company: String!, username: String!): User!
    registerAlumni(registerAlumniInput: RegisterAlumniInput): Alumni!
    changePermission(
      email: String!
      currentEmail: String!
      permission: String!
    ): User!
    editUserProfile(editUserProfileInput: EditUserProfileInput): User!
    editUpdatedAt(editUpdatedAtInput: EditUpdatedAtInput): User!
    updateYears: [User]
    reimbursementRequest(reimbursementInput: ReimbursementInput): Reimbursement!
    resolveReimbursement(id: ID!, email: String!): Reimbursement!
    unresolveReimbursement(id: ID!, email: String!): Reimbursement!
    cancelReimbursement(id: ID!, email: String!): Reimbursement!
    uncancelReimbursement(id: ID!, email: String!): Reimbursement!
    checkOutItem(data: TransactionData): [Rentable]
    pickUpItem(receiptID: ID!): Receipt
    returnItem(receiptID: ID!): Receipt
    unPickUpItem(receiptID: ID!): Receipt
    unReturnItem(receiptID: ID!): Receipt
    deleteReceipt(receiptID: ID!): Receipt
    submitContactRequest(
      firstName: String!
      lastName: String!
      email: String!
      messageType: String!
      message: String!
    ): ContactRequest!
    resetPercentile(semester: String!): Int!
    deleteUser(email: String!): Boolean
  }
`;
