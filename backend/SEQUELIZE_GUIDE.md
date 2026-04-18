# 📚 Sequelize ORM Implementation Guide

## Setup Complete ✅

The following has been installed and configured:

### Files Created:
```
backend/
├── config/
│   └── database.js          # Sequelize connection config
├── models/
│   ├── index.js             # Model associations
│   ├── User.js              # User model
│   ├── Balance.js           # Balance model
│   ├── Transaction.js       # Transaction model
│   └── Transfer.js          # Transfer model
├── migrate/
│   └── 003_production_schema.sql  # SQL schema
├── scripts/
│   └── initDb.js            # Database initialization script
└── server.js                # Updated with Sequelize init
```

---

## 📖 Usage Guide

### 1. **Initialize Database** (First time setup)

```bash
npm run init:db
```

This will:
- ✅ Authenticate with PostgreSQL
- ✅ Create all tables
- ✅ Sync models

### 2. **Start Server**

```bash
npm start
```

The server will automatically sync models if `DATABASE_URL` is set.

---

## 💾 Model Usage Examples

### Import Models

```javascript
import { User, Balance, Transaction, Transfer } from "./models/index.js";
```

---

### User Operations

#### Create User with Balance

```javascript
const user = await User.create({
  email: "john@example.com",
  password_hash: hashedPassword,
  wallet_address: "0x123...",
});

// Create associated balance
await Balance.create({
  user_id: user.id,
  available_balance: 0,
  pending_balance: 0,
});
```

#### Find User with Balance

```javascript
const user = await User.findByPk(userId, {
  include: Balance, // Include associated balance
});

console.log(user.email);
console.log(user.Balance.available_balance);
```

#### Find by Email

```javascript
const user = await User.findOne({
  where: { email: "john@example.com" },
  include: Balance,
});
```

#### Update Balance

```javascript
const balance = await Balance.findOne({
  where: { user_id: userId },
});

balance.available_balance += 100;
await balance.save();
```

---

### Transaction Operations

#### Create Transaction

```javascript
const transaction = await Transaction.create({
  user_id: userId,
  type: "deposit", // or "transfer", "withdrawal"
  amount: 50.50,
  status: "pending",
  tx_hash: "0xabc123...",
  reference: "deposit-001",
});
```

#### Get User Transactions

```javascript
const transactions = await Transaction.findAll({
  where: { user_id: userId },
  order: [["created_at", "DESC"]],
});
```

#### Update Transaction Status

```javascript
const tx = await Transaction.findByPk(txId);
tx.status = "completed";
await tx.save();
```

---

### Transfer Operations

#### Create Transfer (User to User)

```javascript
const transfer = await Transfer.create({
  sender_id: senderId,
  receiver_id: receiverId,
  amount: 25.00,
});
```

#### Get User's Sent Transfers

```javascript
const user = await User.findByPk(userId, {
  include: {
    association: "sentTransfers",
    include: {
      association: "receiver",
      attributes: ["email", "wallet_address"],
    },
  },
});

user.sentTransfers.forEach(transfer => {
  console.log(`Sent ${transfer.amount} to ${transfer.receiver.email}`);
});
```

#### Get User's Received Transfers

```javascript
const user = await User.findByPk(userId, {
  include: {
    association: "receivedTransfers",
    include: {
      association: "sender",
      attributes: ["email"],
    },
  },
});
```

---

## 🔄 Database Transactions (Important!)

**Always wrap financial operations in transactions:**

```javascript
import { sequelize } from "./models/index.js";

const transaction = await sequelize.transaction();

try {
  // Debit from sender
  const senderBalance = await Balance.findOne(
    { where: { user_id: senderId } },
    { transaction }
  );
  senderBalance.available_balance -= amount;
  await senderBalance.save({ transaction });

  // Credit to receiver
  const receiverBalance = await Balance.findOne(
    { where: { user_id: receiverId } },
    { transaction }
  );
  receiverBalance.available_balance += amount;
  await receiverBalance.save({ transaction });

  // Record transfer
  await Transfer.create(
    {
      sender_id: senderId,
      receiver_id: receiverId,
      amount,
    },
    { transaction }
  );

  // Commit if all succeed
  await transaction.commit();
  console.log("Transfer successful");
} catch (error) {
  // Rollback if anything fails
  await transaction.rollback();
  console.error("Transfer failed:", error);
  throw error;
}
```

---

## 🔍 Query Examples

### Pagination

```javascript
const page = 1;
const limit = 10;

const transactions = await Transaction.findAll({
  where: { user_id: userId },
  offset: (page - 1) * limit,
  limit,
  order: [["created_at", "DESC"]],
});
```

### Filtering

```javascript
const deposits = await Transaction.findAll({
  where: {
    user_id: userId,
    type: "deposit",
    status: "completed",
  },
});
```

### Aggregating

```javascript
import { Op } from "sequelize";

const totalDeposited = await Transaction.sum("amount", {
  where: {
    user_id: userId,
    type: "deposit",
    status: "completed",
  },
});
```

### Counting

```javascript
const transactionCount = await Transaction.count({
  where: { user_id: userId },
});
```

---

## ⚙️ Configuration

### Production Database Setup

Update `.env`:

```
DATABASE_URL=postgresql://username:password@localhost:5432/defigate_prod
NODE_ENV=production
```

### Development (In-Memory)

Leave `DATABASE_URL` unset:

```
# DATABASE_URL not set = uses in-memory fallback
```

---

## 🚨 Important Notes

### 1. **NUMERIC(20,6) for Money**
- Stores up to 20 digits with 6 decimal places
- Never use float for financial data
- Example: 999999999999999.999999

### 2. **Always Use Transactions for Transfers**
```javascript
// ❌ DON'T DO THIS:
balance1.amount -= 100;
balance2.amount += 100;
// If error between these, you lose money!

// ✅ DO THIS:
const tx = await sequelize.transaction();
try {
  await balance1.update({ amount: balance1.amount - 100 }, { transaction: tx });
  await balance2.update({ amount: balance2.amount + 100 }, { transaction: tx });
  await tx.commit();
} catch (e) {
  await tx.rollback();
}
```

### 3. **Unique Constraints**
- `wallet_address` is UNIQUE (prevent multi-account mapping)
- `user_id` in balances is UNIQUE (one balance per user)
- `email` is UNIQUE (no duplicate accounts)

### 4. **Foreign Key Cascades**
- Deleting a user automatically deletes their:
  - Balance
  - Transactions
  - Transfers (as sender and receiver)

---

## 📊 Database Schema

```
users
├─ id (UUID, PK)
├─ email (unique)
├─ password_hash
├─ wallet_address (unique)
└─ created_at

balances
├─ id (UUID, PK)
├─ user_id (FK, unique)
├─ available_balance (NUMERIC 20,6)
├─ pending_balance (NUMERIC 20,6)
└─ updated_at

transactions
├─ id (UUID, PK)
├─ user_id (FK)
├─ type (deposit|transfer|withdrawal)
├─ amount (NUMERIC 20,6)
├─ status (pending|completed|failed)
├─ tx_hash
├─ reference
└─ created_at

transfers
├─ id (UUID, PK)
├─ sender_id (FK)
├─ receiver_id (FK)
├─ amount (NUMERIC 20,6)
└─ created_at
```

---

## ✅ Ready for Production

This schema and ORM setup supports:
- ✅ User management
- ✅ Wallet mapping
- ✅ Balance tracking (available + pending)
- ✅ Transaction history
- ✅ Internal transfers
- ✅ Atomic operations (transactions)
- ✅ Full audit trail (created_at timestamps)
- ✅ Cascade deletes (data integrity)
