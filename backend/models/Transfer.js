import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Transfer = sequelize.define(
  "Transfer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    receiver_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
    },
  },
  {
    tableName: "transfers",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

export default Transfer;
