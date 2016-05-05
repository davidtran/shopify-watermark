module.exports = (sequelize, DataTypes) => {
  var WatermarkConfig = sequelize.define('WatermarkConfig', {
    type: DataTypes.STRING,
    imagePath: DataTypes.STRING,
    imageSize: DataTypes.INTEGER(1),
    text: DataTypes.STRING,
    fontSize: DataTypes.INTEGER,
    position: DataTypes.STRING(20),
    fontName: DataTypes.STRING(50),
    textColor: DataTypes.STRING(20),
    opacity: DataTypes.INTEGER(1)
  }, {
    underscored: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    classMethods: {
      associate: (models) => {
        WatermarkConfig.belongsTo(models.Shop, {
          onDelete: 'CASCADE',
          foreignKey: {
            allowNull: false
          }
        });
      }
    }
  });

  WatermarkConfig.Positions = {
    Left: 'Left',
    TopLeft: 'Top Left',
    Top: 'Top',
    TopRight: 'Top Right',
    Right: 'Right',
    RightBottom: 'Right Bottom',
    Bottom: 'Bottom',
    LeftBottom: 'LeftBottom'
  }
  return WatermarkConfig;
}