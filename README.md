# SHPE UF Server

![alt text](https://shpeuf.s3.amazonaws.com/public/misc/logo_horizontal.png)

This repository is the backend code for the [SHPE UF website](https://membershpeuf.netlify.app).
SHPE, also known as the Society of Hispanic Professional Engineers, is a Hispanic community at the
University of Florida that strives to reach its fullest potential by impacting the world through STEM
awareness, access, support and development. The goal of this website is to allow our community easy
access to several professional, academic and communal resoures.

# Getting Started

To start working on the repository. You must create a local folder in your computer in which you will clone this repo. Use the following commands to clone the server and install the required dependencies.

```sh
git clone https://github.com/shpe-uf/SHPE-UF-CLIENT.git
cd SHPE-UF-SERVER
npm install
```

If this is your first time running the backend server, make sure to refer to our team's google drive to learn how to set up a .env file required to run the server. If you do not do this, you will get a error and it will not run.

# Running The Server

To start the server:

```sh
npm start
```

Runs the server in development mode on port 5000. Clicking on the link will take you to the Apollo Studio Sandbox. A GraphQL API development environment that allows you to test queries and mutations.

## Project Structure

The project is organized as follows:

- `/graphql`: Contains GraphQL-related files
  - `/resolvers`: GraphQL resolvers for different entities
  - `typeDefs.js`: GraphQL type definitions

- `/models`: MONGODB models representing different entities
  - `Alumni.js`
  - `ContactRequest.js`
  - `Corporation.js`
  - `Event.js`
  - `Receipt.js`
  - `Reimbursement.js`
  - `Rentable.js`
  - `Request.js`
  - `Resource.js`
  - `Task.js`
  - `User.js`

- `/json`: Static data and enumeration values
  - Contains various .json files (e.g., category.json, country.json, courses.json)
  - These files contain predefined lists and options used throughout the application
  - Example: `major.json` contains a list of engineering majors

- `/node_modules`: Node.js dependencies

- `/util`: Utility functions and helpers


# Backend Implementation

Our frontend connects with the backend using GraphQL. Below attached examples of queries and mutations.

```js
# Example query
query GetUser($id: ID!) {
  user(id: $id) {
    name
    email
  }
}

# Example mutation
mutation CreateUser($name: String!, $email: String!) {
  createUser(name: $name, email: $email) {
    id
    name
    email
  }
}
```
# Build scripts

Build scripts are not included in this readme beacause the build is deployed on Heroku which builds the server for us
