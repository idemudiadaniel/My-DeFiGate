import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Wallet = sequelize.define(
  "Wallet",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    provider_wallet_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    chain: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    encrypted_private_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "wallets",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Wallet;
