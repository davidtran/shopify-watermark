module.exports = function(sequelize, DataTypes) {
  var Product = sequelize.define('Product', {
    productId: DataTypes.BIGINT,
    name: DataTypes.STRING,
    featuredImage: DataTypes.STRING
  }, {
    underscored: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    classMethods: {
      associate: (models) => {
        Product.belongsTo(models.Shop, {
          onDelete: 'CASCADE',
          foreignKey: {
            allowNull: false
          }
        })

        Product.hasMany(models.ProductImage, {
          foreignKey: 'ProductId'
        });
      }
    }
  });
  return Product;
}