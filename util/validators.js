const parseDataURL = require("data-urls");

module.exports.validateRegisterInput = (
  firstName,
  lastName,
  major,
  year,
  graduating,
  country,
  ethnicity,
  sex,
  username,
  email,
  password,
  confirmPassword
) => {
  const errors = {};

  const nameValidator = /^[a-zA-Z ',.-]{3,20}$/;
  const usernameValidator = /^(?=.{6,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/i;
  const emailRegex = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,12})$/;
  const passwordValidator = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-.]).{8,}$/;

  if (firstName.trim() === "") {
    errors.firstName = "First name is required.";
  } else {
    if (!firstName.match(nameValidator)) {
      errors.firstName =
        "First Name must be at least 3 characters, max 20. No special characters or numbers.";
    }
  }

  if (lastName.trim() === "") {
    errors.lastName = "Last Name is required.";
  } else {
    if (!lastName.match(nameValidator)) {
      errors.lastName =
        "Last name must be at least 3 characters, max 20. No special characters or numbers.";
    }
  }

  if (major.trim() === "") {
    errors.major = "Major is required.";
  }

  if (year.trim() === "") {
    errors.year = "Year is required.";
  }

  if (graduating.trim() === "") {
    errors.graduating = "Graduating is required.";
  }

  if (country.trim() === "") {
    errors.country = "Country of Origin is required.";
  }

  if (ethnicity.trim() === "") {
    errors.ethnicity = "Ethnicity is required.";
  }

  if (sex.trim() === "") {
    errors.sex = "Sex is required.";
  }

  if (username.trim() === "") {
    errors.username = "Username is required.";
  } else {
    if (!username.match(usernameValidator)) {
      errors.username =
        "Username must be at least 6 characters, max 20. No special characters, except for periods (.) and underscores (_).";
    }
  }

  if (email.trim() === "") {
    errors.email = "Email is required.";
  } else {
    if (!email.match(emailRegex)) {
      errors.email = "Invalid email address.";
    } else if (email.length > 7) {
      var indexUF = email.length - 8;
      var indexSF = email.length - 14;
      if (
        email.substring(indexUF) != "@ufl.edu" &&
        email.substring(indexSF) != "@sfcollege.edu"
      ) {
        errors.email =
          "University of Florida or Santa Fe College email required.";
      }
    }
  }

  if (password === "") {
    errors.password = "Password is required.";
  } else if (!password.match(passwordValidator)) {
    errors.password =
      "Passwords must be at least 8 characters. It must contain at least one lowercase character, one uppercase character, one number, and one special character.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Password and Confirm Password must match.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateLoginInput = (usernameOrEmail, password) => {
  const errors = {};

  if (usernameOrEmail.trim() === "") {
    errors.usernameOrEmail = "Username or email is required.";
  }

  if (password.trim() === "") {
    errors.password = "Password is required.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validatePasswordInput = (password, confirmPassword) => {
  const errors = {};
  const passwordValidator = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-.]).{8,}$/;

  if (password === "") {
    errors.password = "Password is required.";
  } else if (!password.match(passwordValidator)) {
    errors.password =
      "Passwords must be at least 8 characters. It must contain at least one lowercase character, one uppercase character, one number, and one special character.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Password and Confirm Password must match.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateEmailInput = (email) => {
  const emailRegex = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,12})$/;
  const errors = {};

  if (email.trim() === "") {
    errors.email = "Email is required.";
  } else {
    if (!email.match(emailRegex)) {
      errors.email = "Invalid email address.";
    }
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateCreateEventInput = (
  name,
  code,
  category,
  points,
  expiration
) => {
  const errors = {};

  const nameValidator = /^[a-zA-Z0-9- ]{6,50}$/i;
  const codeValidator = /^[a-zA-Z0-9]{6,50}$/i;

  if (name.trim() === "") {
    errors.name = "Name is required.";
  } else {
    if (!name.match(nameValidator)) {
      errors.name =
        "Event name must be at least 6 characters, max 50. No special characters, except for hyphens (-) and dashes (/).";
    }
  }

  if (code.trim() === "") {
    errors.code = "Code is required.";
  } else {
    if (!code.match(codeValidator)) {
      errors.code =
        "Event code must be at least 6 characters, max 50. No special characters.";
    }
  }

  if (category.trim() === "") {
    errors.category = "Category is required.";
  }

  if (expiration.trim() === "") {
    errors.expiration = "Expires in is required.";
  }

  if (points < 0 || points > 10) {
    errors.points = "Points must be a whole number greater than 0 and less than 10.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateCreateTaskInput = (
  name,
  startDate,
  endDate,
  description,
  points
) => {

  const errors = {};

  const nameValidator = /^[a-zA-Z0-9- ]{6,50}$/i;

  if (name.trim() === "") {
    errors.name = "Name is required.";
  } else {
    if (!name.match(nameValidator)) {
      errors.name =
        "Task name must be at least 6 characters, max 50. No special characters, except for hyphens (-) and dashes (/).";
    }
  }

  if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
    errors.date = "Invalid date, please enter a 'MM/DD/YYYY' format"
  } else {
    let start = new Date(Date.parse(startDate))
    let end = new Date(Date.parse(endDate))
    let d = new Date()
    let futureLimit = new Date(d.getFullYear() + 1, d.getMonth(), d.getDay())
    let pastLimit = new Date(d.getFullYear() - 1, d.getMonth(), d.getDay())
    if (start > futureLimit || end > futureLimit) {
      errors.date = "Invalid date, too far into the future"
    } else if (start < pastLimit || end < pastLimit) {
      errors.date = "Invalid date, too far into the past"
    } else if (end <= start) {
      errors.date = "End date needs to be after start date"
    }
  }

  if (description.trim() === "" && description.length > 280) {
    errors.description = "Description must be between 1 and 280 characters."
  }
  if (typeof (points) !== 'number') {
    errors.points = "Points must be a whole number greater than 0.";
  }

  if (points < 0 || points > 10) {
    errors.points = "Points must be a whole number greater than 0.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateCreateResourceInput = (
  title,
  link,
  description,
  image,
  podcast
) => {

  const errors = {};

  const titleValidator = /^[a-zA-Z0-9- ]{6,50}$/i;

  const linkValidator = /^(https?:\/\/)?([0-9\x41-\x5A\x61-\x7A\xC0-\xF6\xF8-\xFF.-]){1,63}(\.)[0-9\x41-\x5A\x61-\x7A\xC0-\xF6\xF8-\xFF0-9]{1,63}(((\/)[0-9\x41-\x5A\x61-\x7A\xC0-\xF6\xF8-\xFF-=?#&]{1,63}){1,63})?(\/)?((\.)[0-9\x41-\x5A\x61-\x7A\xC0-\xF6\xF8-\xFF.-=?#&]{1,63})?$/gm;

  //Other link validators if needed
  //Without other countries characters: /^https?:\/\/([a-zA-Z0-9.-]){1,63}(\.)[a-zA-Z0-9]{1,63}(((\/)[a-zA-Z0-9-]{1,63}){1,63})?(\/)?((\.)[a-zA-Z0-9.]{1,63})?$/gm;
  //With other chars in domain name, must include http/https: /^https?:\/\/([0-9\x41-\x5A\x61-\x7A\xC0-\xF6\xF8-\xFF.-]){1,63}(\.)[a-zA-Z0-9]{1,63}(((\/)[a-zA-Z0-9-=?#&]{1,63}){1,63})?(\/)?((\.)[a-zA-Z0-9.-=?#&]{1,63})?$/gm

  if (!title.trim()) {
    errors.title = "Title is required.";
  } else {
    if (!title.match(titleValidator)) {
      errors.title =
        "Resource name must be at least 6 characters, max 50. No special characters, except for hyphens (-) and dashes (/).";
    }
  }

  if (!link.trim()) {
    errors.link = "Link is required.";
  } else {
    if (!link.match(linkValidator)) {
      errors.link =
        "Link must be valid format.";
    }
  }


  if (!description.trim() && description.length > 280) {
    errors.description = "Description must be between 1 and 150 characters."
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateRedeemPointsInput = (code) => {
  const errors = {};

  if (code.trim() === "") {
    errors.code = "No code was provided.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateManualInputInput = (username) => {
  const errors = {};

  if (username.trim() === "") {
    errors.username = "No username was provided.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateManualTaskInputInput = (username) => {
  const errors = {};

  if (username.trim() === "") {
    errors.username = "No username was provided.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateCreateEditCorporationInput = (
  name,
  logo,
  slogan,
  majors,
  industries,
  overview,
  mission,
  goals,
  businessModel,
  newsLink,
  applyLink,
  recruitmentDay,
  signUpLink
) => {
  const errors = {};

  if (name.trim() === "") {
    errors.name = "No name was provided.";
  }

  if (logo.trim() === "") {
    errors.logo = "No logo was provided.";
  }

  if (slogan.trim() === "") {
    errors.slogan = "No slogan was provided.";
  }

  if (majors.length === 0) {
    errors.majors = "No majors were provided.";
  }

  if (industries.length === 0) {
    errors.industries = "No industries were provided.";
  }

  if (overview.trim() === "") {
    errors.overview = "No overview was provided.";
  }

  if (mission.trim() === "") {
    errors.mission = "No mission was provided.";
  }

  if (goals.trim() === "") {
    errors.goals = "No goals were provided.";
  }

  if (businessModel.trim() === "") {
    errors.businessModel = "No business model was provided.";
  }

  if (newsLink.trim() === "") {
    errors.newsLink = "No news link was provided.";
  }

  if (applyLink.trim() === "") {
    errors.applyLink = "No apply link was provided.";
  }
  if (recruitmentDay && signUpLink.trim() === "") {
    errors.signUpLink = "No sign up link was provided.";
  }



  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateCreateEditPartnerInput = (
  name,
  photo,
  tier,
) => {
  const errors = {};

  if (name.trim() === "") {
    errors.name = "No name was provided.";
  }

  if (photo.trim() === "") {
    errors.logo = "No photo was provided.";
  }

  if (tier.trim() === "") {
    errors.slogan = "No tier was provided.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateEditUserProfile = (
  firstName,
  lastName,
  photo,
  major,
  year,
  graduating,
  country,
  ethnicity,
  sex
) => {
  const errors = {};

  const nameValidator = /^[a-zA-Z ',.-]{3,20}$/;

  if (firstName.trim() === "") {
    errors.firstName = "First name is required.";
  } else {
    if (!firstName.match(nameValidator)) {
      errors.firstName =
        "First Name must be at least 3 characters, max 20. No special characters or numbers.";
    }
  }

  if (lastName.trim() === "") {
    errors.lastName = "Last Name is required.";
  } else {
    if (!lastName.match(nameValidator)) {
      errors.lastName =
        "Last name must be at least 3 characters, max 20. No special characters or numbers.";
    }
  }

  if (photo) {
    const dataUrlData = parseDataURL(photo);

    if (dataUrlData.mimeType.toString().slice(0, 6) !== "image/") {
      errors.photo = "Please use a valid image file for photo.";
    } else if (Buffer.byteLength(dataUrlData.body) > 102400) {
      errors.photo =
        "Please use an image file that doesn't exceed the maximum file size (100 KB)";
    }
  }


  if (major.trim() === "") {
    errors.major = "Major is required.";
  }

  if (year.trim() === "") {
    errors.year = "Year is required.";
  }

  if (graduating.trim() === "") {
    errors.graduating = "Graduating is required.";
  }

  if (country.trim() === "") {
    errors.country = "Country of Origin is required.";
  }

  if (ethnicity.trim() === "") {
    errors.ethnicity = "Ethnicity is required.";
  }

  if (sex.trim() === "") {
    errors.sex = "Sex is required.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateEditUpdatedAt = (
  email,
) => {
  const errors = {};

  if (email.trim() === "") {
    errors.code = "No email was provided.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
}

module.exports.validateRegisterAlumniInput = (
  firstName,
  lastName,
  email,
  undergrad,
  grad,
  employer,
  position,
  location,
  linkedin
) => {
  const errors = {};

  const nameValidator = /^[a-zA-Z ',.-]{3,20}$/;
  const emailValidator = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,12})$/;
  const yearValidator = /^\d{4}$/;

  if (firstName.trim() === "") {
    errors.firstName = "First name is required.";
  } else {
    if (!firstName.match(nameValidator)) {
      errors.firstName =
        "First Name must be at least 3 characters, max 20. No special characters or numbers.";
    }
  }

  if (lastName.trim() === "") {
    errors.lastName = "Last Name is required.";
  } else {
    if (!lastName.match(nameValidator)) {
      errors.lastName =
        "Last name must be at least 3 characters, max 20. No special characters or numbers.";
    }
  }

  if (email.trim() === "") {
    errors.email = "Email is required.";
  } else {
    if (!email.match(emailValidator)) {
      errors.email = "Invalid email address.";
    }
  }

  if (undergrad.university.trim() === "") {
    errors.undergradUniversity = "Undergraduate university is required.";
  }

  if (undergrad.year.trim() === "") {
    errors.undergradYear = "Undergraduate year is required.";
  } else {
    if (!undergrad.year.match(yearValidator)) {
      errors.undergradYear = "Invalid undergraduate year.";
    }
  }

  if (undergrad.major.trim() === "") {
    errors.undergradMajor = "Undergraduate major is required.";
  }

  if (
    grad.university.trim() !== "" ||
    grad.year.trim() !== "" ||
    grad.major.trim() !== ""
  ) {
    if (grad.university.trim() === "") {
      errors.gradUniversity = "Graduate university is required.";
    }

    if (grad.year.trim() === "") {
      errors.gradYear = "Graduate year is required.";
    } else {
      if (!grad.year.match(yearValidator)) {
        errors.gradYear = "Invalid graduate year.";
      }
    }

    if (grad.major.trim() === "") {
      errors.gradMajor = "Graduate major is required.";
    }
  }

  if (
    grad.university.trim() === "" &&
    grad.year.trim() === "" &&
    grad.major.trim() === ""
  ) {
    if (employer.trim() === "") {
      errors.employer = "Employer is required.";
    }

    if (position.trim() === "") {
      errors.position = "Position is required.";
    }
  }

  if (location.city.trim() === "") {
    errors.locationCity = "City is required.";
  }

  if (location.country === "United States") {
    if (location.state.trim() === "") {
      errors.locationState = "State is required.";
    }
  }

  if (location.country.trim() === "") {
    errors.locationCountry = "Country is required.";
  }

  if (linkedin.trim() === "") {
    errors.linkedin = "LinkedIn Profile link is required.";
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateCreateClassInput = (code) => {
  const errors = {};

  const codeValidator = /^[a-zA-Z0-9]*$/i;

  if (code.trim() === "") {
    errors.code = "No code was provided.";
  } else {
    if (!code.match(codeValidator)) {
      errors.code =
        "Course code must be made up of letters (A-Z) and numbers (0-9). No special characters allowed.";
    }
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateReimbursementRequest = (
  firstName,
  lastName,
  email,
  studentId,
  address,
  company,
  event,
  description,
  reimbursed,
  amount
) => {
  const errors = {};

  const nameValidator = /^[a-zA-Z ',.-]{3,20}$/;
  const emailValidator = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,12})$/;

  if (firstName.trim() === "") {
    errors.firstName = "First name is required.";
  } else {
    if (!firstName.match(nameValidator)) {
      errors.firstName =
        "First Name must be at least 3 characters, max 20. No special characters or numbers.";
    }
  }

  if (lastName.trim() === "") {
    errors.lastName = "Last Name is required.";
  } else {
    if (!lastName.match(nameValidator)) {
      errors.lastName =
        "Last name must be at least 3 character, max 20. No special characters or numbers.";
    }
  }

  if (email.trim() === "") {
    errors.email = "Email is required.";
  } else {
    if (!email.match(emailValidator)) {
      errors.email = "Invalid email address.";
    }
  }

  if (studentId.trim() === "") {
    errors.studentId = "Student ID is required."
  } else if (isNaN(studentId)) {
    errors.studentId = "Student ID can only be numbers."
  } else {
    if (studentId > 99999999 || studentId < 10000000) {
      errors.studentId = "Invalid student ID.";
    }
  }

  if (amount.trim() === "") {
    errors.amount = "Amount is required."
  }

  if (address.trim() === "") {
    errors.address = "Address is required."
  }

  if (company.trim() === "") {
    errors.company = "Company is required."
  }

  if (event.trim() === "") {
    errors.event = "Event is required."
  }

  if (description.trim() === "") {
    errors.description = "Description is required."
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1
  };
};

module.exports.validateRentalRequest = (
  numberRequested,
  totalQuantity,
  currentRenters
) => {
  let errors = {};

  //is in stock?
  if (totalQuantity - (currentRenters.length + numberRequested) < 0) {
    errors.availability =
      "The requested number is too high for the current stock";
  }

  if (numberRequested === 0) {
    errors.invalid = 'The requested number must be greater than 0';
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };
};

module.exports.validateContactUsForm = (
  firstName,
  lastName,
  email,
  messageType,
  message,
) => {
  const errors = {};

  const emailValidator = /^([0-9a-zA-Z]([-.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,12})$/;

  if (firstName.trim() === "") {
    errors.firstName = "First name is required.";
  } else {
    if (firstName.length > 20) {
      errors.firstName = "First name must be 20 characters max."
    }
  }

  if (lastName.trim() === "") {
    errors.lastName = "Last Name is required.";
  } else {
    if (lastName.length > 20) {
      errors.lastName = "Last name must be 20 characters max."
    }
  }

  if (email.trim() === "") {
    errors.email = "Email is required.";
  } else {
    if (!email.match(emailValidator)) {
      errors.email = "Invalid email address.";
    }
  }

  if (messageType.trim() === "") {
    errors.messageType = "Goal is required.";
  }

  if (message.trim() === "") {
    errors.message = "Message is required.";
  } else {
    if (message.length > 500) {
      errors.message = "Message must be 500 characters max."
    }
  }

  return {
    errors,
    valid: Object.keys(errors).length < 1,
  };

}
