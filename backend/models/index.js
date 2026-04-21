import sequelize from "../config/database.js";
import User from "./User.js";
import Balance from "./Balance.js";
import Transaction from "./Transaction.js";
import Transfer from "./Transfer.js";
import Wallet from "./Wallet.js";

// ========== ASSOCIATIONS ==========

// User -> Wallet (One-to-Many)
User.hasMany(Wallet, { foreignKey: "user_id", onDelete: "CASCADE" });
Wallet.belongsTo(User, { foreignKey: "user_id" });

// User -> Balance (One-to-One)
User.hasOne(Balance, { foreignKey: "user_id", onDelete: "CASCADE" });
Balance.belongsTo(User, { foreignKey: "user_id" });

// User -> Transaction (One-to-Many)
User.hasMany(Transaction, { foreignKey: "user_id", onDelete: "CASCADE" });
Transaction.belongsTo(User, { foreignKey: "user_id" });

// User -> Transfer (One-to-Many) - Sender
User.hasMany(Transfer, { 
  foreignKey: "sender_id", 
  as: "sentTransfers",
  onDelete: "CASCADE" 
});
Transfer.belongsTo(User, { 
  foreignKey: "sender_id", 
  as: "sender" 
});

// User -> Transfer (One-to-Many) - Receiver
User.hasMany(Transfer, { 
  foreignKey: "receiver_id", 
  as: "receivedTransfers",
  onDelete: "CASCADE" 
});
Transfer.belongsTo(User, { 
  foreignKey: "receiver_id", 
  as: "receiver" 
});

export { sequelize, User, Balance, Transaction, Transfer, Wallet };
