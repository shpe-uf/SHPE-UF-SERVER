const { UserInputError } = require("apollo-server");

const Reimbursement = require("../../models/Reimbursement.js");

const { validateReimbursementRequest } = require("../../util/validators");

module.exports = {
    Query: {
        async getReimbursements() {
            try {
                const reimbursement = await Reimbursement.find().sort({lastName: 1, firstName: 1});
                return reimbursement;
            } catch (err) {
                throw new Error(err);
            }
        }
    },

    Mutation: {
        async reimbursementRequest(
            _,
            {
                reimbursementInput: {
                    firstName,
                    lastName,
                    email,
                    studentId,
                    address,
                    company,
                    event,
                    description,
                    reimbursed,
                    amount,
                    execute
                }
            }
        ) {
            const { valid, errors } = validateReimbursementRequest(
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
            );

            if (!valid) {
                throw new UserInputError("Errors", {
                    errors
                });
            }

                const newReimbursement = new Reimbursement({
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
                });

            
            if (execute) {
                console.log(newReimbursement);
                await newReimbursement.save();
            }
            
            return newReimbursement;            
        }
    }
};