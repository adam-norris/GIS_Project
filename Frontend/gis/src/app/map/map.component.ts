import { Component, OnInit, Input, ViewEncapsulation, IterableDiffers, DoCheck, IterableChangeRecord } from '@angular/core';

import * as L from 'leaflet';
import { Overlay } from '../types/map.types';
import * as comp from './comparisons'

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'], 
  // super important, otherwise the defined css doesn't get added to dynamically created elements, for example, from D3.
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements OnInit{

  @Input() overlays: Array<Overlay> = [];
  iterableDiffer: any;
  
  mymap;
  shapes = new L.LayerGroup();
  shapes2compare = new L.LayerGroup();

  private layerControl: L.Control.Layers;

  constructor(private iterable: IterableDiffers) {
    this.iterableDiffer = this.iterable.find(this.overlays).create();
  }

  ngOnInit() {
    // use osm tiles
    const basemap = L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // create map, set initial view to basemap and zoom level to center of BW
    this.mymap = L.map('main', { layers: [basemap,this.shapes] }).setView([48.6813312, 9.0088299], 9);
    
//    const baseMaps = {
//      OpenStreetMap: basemap,
//    }
    // add a control which lets us toggle maps and overlays
//    this.layerControl = L.control.layers(baseMaps);
//    this.layerControl.addTo(this.mymap);

     //leaflet Draw toolbar
    var drawnItems = new L.FeatureGroup();
    this.mymap.addLayer(drawnItems);
    var drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
        }
    });
    this.mymap.addControl(
      drawControl
    );
 
    //add shape from leaflet draw to map
    this.mymap.on('draw:created',  (e) => {

      var type = e.layerType,
          shape = e.layer;
  
      if (type === 'marker') {
          // Do marker specific actions
      }

      //add event handler when shape is clicked
      shape.on('click',this.handleClick);

      //add to shapes layer
      this.shapes.addLayer(shape)
      console.log(this.shapes)
  });


  }

  //called when a shape is clicked
  handleClick = (event) => {
    let clickedShape = event.target;

    clickedShape.off('click', clickedShape.openPopup);
    
    //change color -- markers are images and dont have color
    if(!(clickedShape instanceof L.Marker))
      clickedShape.setStyle({color:'red'})
    
    this.mymap.closePopup();
//    this.shapes.closePopup();

    //if no shape was clicked before, add clicked shape to shape2compare
    if(this.shapes2compare.getLayers().length === 0){
      this.shapes2compare.addLayer(clickedShape)
    }

    //if a shape was clicked before, get both shapes and do compare
    else{
      this.shapes2compare.addLayer(clickedShape)
//      console.log("layers to compare", this.shapes2compare.getLayers())
      let shapes = this.shapes2compare.getLayers()
      this.handleComparison(shapes)


      //clear shapes2compare
      this.shapes2compare.eachLayer( (shape) => {
        //change color back after comparison
        setTimeout(function() {
          var elements = document.getElementsByClassName('leaflet-interactive');
          for (var i in elements) {
            if (elements.hasOwnProperty(i)) {
              elements[i].setAttribute('stroke','#3388ff');
              elements[i].setAttribute('fill','#3388ff');
            }
          }
        }, 1500);

        shape.unbindPopup();
        this.shapes2compare.removeLayer(shape);
      })
    }


  }
  
  handleComparison = (shapes) =>{
    //get type of shapes
    let s = []    
    s.push(this.getTypeOfLayer(shapes[0]))
    s.push(this.getTypeOfLayer(shapes[1]))
    
    let comps = s[0].type + "2" + s[1].type;

    //console.log(s,comps)
    
    let result;
    //determine appropiate comparison
    switch(comps){
      case "point2point":
        result = "distance: " + comp.p2p(s[0],s[1]) + "km"
        console.log("p2p check: ", result);
        break;
      case "point2line":
        console.log("p2l check");
        result = "distance: " + comp.p2l(s[1],s[0]) + "km";
        break;
      case "line2point": 
        console.log("p2l check");
        result = "distance: " + comp.p2l(s[0],s[1]) + "km";
        break;
      case "line2line":
        console.log("l2l check");
        result = "intersect: " + comp.l2l(s[0],s[1]);
        break;
      case "point2polygon":
        console.log("p2poly check");
        result = comp.p2poly(s[0],s[1]);
        break;
      case "polygon2point":
        console.log("p2poly check");
        result = comp.p2poly(s[1],s[0]);
        break;
      case "line2polygon":
        console.log("l2poly check");
        result = "intersect: " + comp.l2poly(s[0],s[1]);
        break;    
      case "polygon2line":
        console.log("l2poly check");
        result = "intersect: " + comp.l2poly(s[1],s[0]);
        break;
      case "polygon2polygon":
        console.log("poly2poly check");
        result = comp.poly2poly(s[0],s[1]);
        break;
      default:
        console.log("no comparison implemented");
    }
    shapes[1].bindPopup(result).openPopup();
  }


  //returns type of layer
  //currently only supports Marker, Line & Polygon
  getTypeOfLayer(layer){
    if((layer instanceof L.Marker) || (layer instanceof L.CircleMarker))
      return {coords: layer.getLatLng(), type: 'point'};
    else if(layer instanceof L.Polygon)
      return {coords: layer.getLatLngs(), type: 'polygon'};
    else if(layer instanceof L.Polyline)
      return {coords: layer.getLatLngs(), type: 'line'};
    else
      return undefined;
  }

  /**
   * If the input data changes, update the layers
   * @param changes the angular changes object
   */
/*   ngDoCheck(): void {
    const changes = this.iterableDiffer.diff(this.overlays);
    if (changes) {

      changes.forEachAddedItem((newOverlay: IterableChangeRecord<Overlay>) => {
        const overlay = newOverlay.item;
        this.layerControl.addOverlay(overlay.createOverlay(), overlay.name);
      });
    }
  } */
}
