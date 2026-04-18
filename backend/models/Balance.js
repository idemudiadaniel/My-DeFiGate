import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Balance = sequelize.define(
  "Balance",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    available_balance: {
      type: DataTypes.DECIMAL(20, 6),
      defaultValue: 0,
    },
    pending_balance: {
      type: DataTypes.DECIMAL(20, 6),
      defaultValue: 0,
    },
  },
  {
    tableName: "balances",
    timestamps: true,
    createdAt: false,
    updatedAt: "updated_at",
  }
);

export default Balance;
