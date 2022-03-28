import {CompositeLayer, IconLayer, TextLayer} from 'deck.gl';

export class LabeledIconLayer extends CompositeLayer {
    renderLayers() {
      return [
        // the icons
        new IconLayer(this.getSubLayerProps({
          // `getSubLayerProps` will concat the parent layer id with this id
          id: 'icon',
          data: this.props.data,
  
          iconAtlas: this.props.iconAtlas,
          iconMapping: this.props.iconMapping,
  
          getPosition: this.props.getPosition,
          getIcon: this.props.getIcon,
          getSize: this.props.getIconSize,
          getColor: this.props.getIconColor,
          getAngle: this.props.getIconAngle,
          transitions: this.props.transitions,

          
          updateTriggers: {
            getPosition: this.props.updateTriggers.getPosition,
            getIcon: this.props.updateTriggers.getIcon,
            getSize: this.props.updateTriggers.getIconSize,
            getColor: this.props.updateTriggers.getIconColor
          }
        })),
        // the labels
        new TextLayer(this.getSubLayerProps({
          // `getSubLayerProps` will concat the parent layer id with this id
          id: 'id',
          data: this.props.data,
  
        //   fontFamily: this.props.fontFamily,
        //   fontWeight: this.props.fontWeight,
  
          getPosition: this.props.getPosition,
          getText: this.props.getText,
          getSize: this.props.getTextSize,
          getColor: this.props.getTextColor,
          
          getBorderColor: this.props.getTextBorderColor,
          getBorderWidth: this.props.getTextBorderWidth,
          outlineWidth: this.props.textOutlineWidth,
          getAngle: this.props.getTextAngle,
          getTextAnchor: this.props.getTextAnchor,
          getAlignmentBaseline: this.props.getTextAlignmentBaseline, 
          getPixelOffset: this.props.getTextPixelOffset,

          transitions: this.props.transitions,

          updateTriggers: {
            getPosition: this.props.updateTriggers.getPosition,
            getText: this.props.updateTriggers.getText,
            getSize: this.props.updateTriggers.getTextSize,
            getColor: this.props.updateTriggers.getTextColor
          }
        }))
      ];
    }
  }

  LabeledIconLayer.layerName = "LabeledIconLayer";