const { gql } = require("graphql-tag");

module.exports = gql`
  ### MAIN MODEL TYPES ###

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

  type ContactRequest {
    firstName: String!
    lastName: String!
    email: String!
    messageType: String!
    message: String!
  }

  type Corporation {
    id: ID!
    name: String!
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
    recruitmentDay: Boolean!
    signUpLink: String
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

  type Resource {
    id: ID!
    title: String!
    link: String!
    description: String
    image: String!
    createdAt: String!
    podcast: Boolean!
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

  type User {
    id: ID!
    firstName: String!
    lastName: String!
    # photo: String!
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

  type Partner {
    name: String!
    photo: String!
    tier: String!
  }


  ### AUXILIARY TYPES ###
  type Coordinates {
  latitude: Float!
  longitude: Float!
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


  ### QUERY AND MUTATION INPUTS ###

  input ApproveRejectRequestInput {
    username: String!
    name: String!
    type: String!
  }

  input BookmarkTaskInput {
    name: String!
    username: String!
  }

  input CreateCorporationInput {
    name: String!
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
    recruitmentDay: String!
    signUpLink: String
  }


  input CreatePartnerInput{
    name: String!
    photo: String!
    tier: String!
  }

  input CreateEventInput {
    name: String!
    code: String!
    category: String!
    points: String!
    expiration: String!
    request: String!
  }

  input CreateResourceInput {
    title: String!
    description: String
    link: String!
    image: String
    podcast: Boolean!
  }

  input CreateTaskInput {
    name: String!
    startDate: String!
    endDate: String!
    description: String!
    points: Int!
  }

  input EditCorporationInput {
    id: ID!
    name: String!
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
    recruitmentDay: String!
    signUpLink: String
  }

  input EditUpdatedAtInput {
    email: String!
    updatedAt: String!
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

  input ManualInputInput {
    username: String!
    eventName: String!
  }

  input ManualTaskInputInput {
    username: String!
    taskName: String!
  }

  input RedeemPointsInput {
    code: String!
    username: String!
    guests: Int!
  }

  input RedeemTasksPointsInput {
    name: String!
    username: String!
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

  input TransactionData {
    item: String!
    username: String!
    numberOfItems: Int!
    email: String!
  }

  input UnBookmarkTaskInput {
    name: String!
    username: String!
  }


  ### AUXILIARY INPUTS ###
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

  input UndergradInput {
    university: String!
    year: String!
    major: String!
  }


  ### QUERIES LIST ###

  type Query {
    getAlumnis: [Alumni]
    getCorporations: [Corporation]
    getCountryStat: [StatData]
    getEthnicityStat: [StatData]
    getEvents: [Event]
    getEventsReversed: [Event]
    getInventory: [Rentable]
    getItem(item: String): Rentable
    getMajorStat: [StatData]
    getMatches(username: String!): [User]
    getReceipts: [Receipt]
    getReimbursements: [Reimbursement]
    getRequests: [Request]
    getResources: [Resource]
    getSexStat: [StatData]
    getTasks: [Task]
    getUser(userId: ID!): User
    getUsers: [User]
    getPartners: [Partner]
    getYearStat: [StatData]
  }


  ### MUTATIONS LIST ###

  type Mutation {
    approveRequest(
      approveRejectRequestInput: ApproveRejectRequestInput
    ): [Request]
    bookmark(company: String!, username: String!): User!
    bookmarkTask(bookmarkTaskInput: BookmarkTaskInput): User!
    cancelReimbursement(id: ID!, email: String!): Reimbursement!
    changePermission(
      email: String!
      currentEmail: String!
      permission: String!
    ): User!
    checkOutItem(data: TransactionData): [Rentable]
    confirmUser(id: String!): User!
    createCorporation(
      createCorporationInput: CreateCorporationInput
    ): Corporation!
    createPartner(
      createPartnerInput: CreatePartnerInput
    ): [Partner]
    createEvent(createEventInput: CreateEventInput): [Event]
    createResource(createResourceInput: CreateResourceInput): [Resource]
    createTask(createTaskInput: CreateTaskInput): Task!
    deleteBookmark(company: String!, username: String!): User!
    deleteCorporation(corporationId: ID!): [Corporation]!
    deleteEvent(eventName: String!): [Event]
    deleteReceipt(receiptID: ID!): Receipt
    deleteResource(resourceId: ID!): [Resource!]
    deleteTask(taskId: ID!): [Task]
    deleteUser(email: String!): Boolean
    editCorporation(editCorporationInput: EditCorporationInput): Corporation!
    editUpdatedAt(editUpdatedAtInput: EditUpdatedAtInput): User!
    editUserProfile(editUserProfileInput: EditUserProfileInput): User!
    forgotPassword(email: String!): User!
    login(username: String!, password: String!, remember: String!): User!
    manualInput(manualInputInput: ManualInputInput): [Event]
    manualTaskInput(manualTaskInputInput: ManualTaskInputInput): Task
    pickUpItem(receiptID: ID!): Receipt
    register(registerInput: RegisterInput): User!
    registerAlumni(registerAlumniInput: RegisterAlumniInput): Alumni!
    rejectRequest(
      approveRejectRequestInput: ApproveRejectRequestInput
    ): [Request]
    reimbursementRequest(reimbursementInput: ReimbursementInput): Reimbursement!
    removeUserFromEvent(manualInputInput: ManualInputInput): Event
    removeUserFromTask(manualTaskInputInput: ManualTaskInputInput): Task
    resetPassword(
      password: String!
      confirmPassword: String!
      token: String!
    ): Token!
    resetPercentile(semester: String!): Int!
    resolveReimbursement(id: ID!, email: String!): Reimbursement!
    returnItem(receiptID: ID!): Receipt
    submitContactRequest(
      firstName: String!
      lastName: String!
      email: String!
      messageType: String!
      message: String!
    ): ContactRequest!
    unBookmarkTask(unBookmarkTaskInput: UnBookmarkTaskInput): User!
    unPickUpItem(receiptID: ID!): Receipt
    unReturnItem(receiptID: ID!): Receipt
    uncancelReimbursement(id: ID!, email: String!): Reimbursement!
    unresolveReimbursement(id: ID!, email: String!): Reimbursement!
    updateYears: [User]
    redeemPoints(redeemPointsInput: RedeemPointsInput): User!
    redeemTasksPoints(redeemTasksPointsInput: RedeemTasksPointsInput): User!
  }

`;
