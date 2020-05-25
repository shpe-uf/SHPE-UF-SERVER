const Rentable = require("../../models/Rentable.js")
const Receipt = require("../../models/Receipt.js")
const User = require("../../models/User.js")

require("dotenv").config();

const { 
  validateRentalRequest,
  validateReturnRequest
 } = require("../../util/validators");

module.exports = {
  Query: {

    async getInventory() {
      try{
        const inventory = await Rentable.find();
        return inventory;
      } catch(err) {
        throw new Error(err);
      }
    },
  
    async getItem(_,{item}) {
      try{
        const rentable = await Rentable.findOne({'item': item})
        return rentable;
      } catch(err) {
        throw new Error(err);
      }
    }
  },
  
  Mutation: {
  
    //=====================================================================
    //========================= Checking out an item ======================
    //=====================================================================
  
    async checkOut(_, data) {
      try{
        console.log('here')
        //fixes bug where Object Null is received
        const {item, username, numberOfItems, email, phone } = JSON.parse(JSON.stringify(data)).data;
  
        const rentable = await Rentable.findOne({'item':item});
        const user = await User.findOne({'username': username});
  
        let { errors, valid } = validateRentalRequest(
          item,
          username,
          numberOfItems,
          rentable.quantity,
          rentable.renters,
          rentable.level,
          user
        );
  
        if (!valid) {
          errors = JSON.stringify(errors);
          throw new Error(errors);
        }
        
        for(var i = 1; i <= numberOfItems; i++) {
          if (!rentable.renters || (rentable.renters.length < 1)){
            rentable.renters = [username];
          } else {
            rentable.renters.push(username);
          }
        }
  
        await rentable.save();
  
        receipts = [];
        const dateOpened = JSON.stringify(new Date());
  
        for(var i = 1; i <= numberOfItems; i++) {
          const receipt = new Receipt({
            username,
            email,
            phone,
            item,
            dateOpened,
            open: true
          })
          receipts.push(await receipt.save());
        }
  
        return receipts;
  
      } catch(err) {
        throw new Error(err);
      }
    },
    
    //=====================================================================
    //========================= Returning an item =========================
    //=====================================================================
  
    async return(_, data) {
      try{
  
        const {item, username, numberOfItems} = JSON.parse(JSON.stringify(data)).data;
  
        const rentable = await Rentable.findOne({'item':item});
        const user = await User.findOne({'username': username});
        const receipts = await Receipt.find({'username': username});
        let { errors, valid } = validateReturnRequest(
          item,
          username,
          numberOfItems,
          rentable.quantity,
          rentable.renters,
          user,
          receipts.filter((e) => {return e.open == true})
        );
  
        if (!valid) {
          errors = JSON.stringify(errors);
          throw new Error(errors);
        }
        
        const dateClosed = JSON.stringify(new Date());
        for(var i = 0; i < numberOfItems; i++) {
          
          //Delete name entries from renters array
          var pos = rentable.renters.indexOf(username);
          if (pos > -1) {
            rentable.renters.splice(pos,1);
          }
  
          //Stamp receipts as complete
          var receiptShift = i;
          while(receipts[receiptShift].open == false) {
            receiptShift++; //looking for empty receipts
          }
          receipts[receiptShift].open = false;
          receipts[receiptShift].dateClosed = dateClosed;
          receipts[receiptShift].save();
        }
  
        rentable.save();
  
        return receipts;
  
      } catch(err) {
        throw new Error(err);
      }
    },
  }
}
