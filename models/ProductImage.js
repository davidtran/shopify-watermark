module.exports = function(sequelize, DataTypes) {
  var ProductImage = sequelize.define('ProductImage', {
    imageId: {
      type: DataTypes.BIGINT,
      unique: true
    },
    position: DataTypes.INTEGER,
    src: DataTypes.STRING,
    originalBase64: DataTypes.BLOB,
    isDownloaded: DataTypes.BOOLEAN,
    isWatermarked: DataTypes.BOOLEAN,
    isRestored: DataTypes.BOOLEAN,
    version: DataTypes.BIGINT
  }, {
    underscored: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    classMethods: {
      associate: models => {
        ProductImage.belongsTo(models.Shop, {
          onDelete: 'CASCADE',
          foreignKey: {
            allowNull: false
          }
        });

        ProductImage.belongsTo(models.Product, {
          onDelete: 'CASCADE',
          foreignKey: {
            allowNull: false
          }
        })
      }
    }
  });
  return ProductImage;
}


