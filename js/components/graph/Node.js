import React from 'react';
import { refLookUp } from "../common/utils";

export default class Node extends React.Component {
    constructor(props) {
        super(props);
        var state = localStorage.getItem(this.props.JSON.id_);
        if (!this.props.onDraw) {
            state = '';
        } else if (state === null) {
            state = this.props.parents.length === 0 ? 'takeable' : 'inactive';
        }
        this.state = {
            status: state,
            selected: ['active', 'overridden'].indexOf(state) >= 0
        };
        this.isSelected = this.isSelected.bind(this);
        this.arePrereqsSatisfied = this.arePrereqsSatisfied.bind(this);
        this.updateNode = this.updateNode.bind(this);
        this.toggleSelection = this.toggleSelection.bind(this);
        this.focusPrereqs = this.focusPrereqs.bind(this);
        this.unfocusPrereqs = this.unfocusPrereqs.bind(this);
    }

    isSelected() {
        if (this.props.hybrid) {
            return this.state.status === 'active';
        } else {
            return this.state.selected;
        }
    }

    arePrereqsSatisfied() {
        var svg = this.props.svg;
        function isAllTrue(element) {
            if (typeof element === 'string') {
                return (svg.refs['nodes'].refs[element] ?
                    svg.refs['nodes'].refs[element].isSelected() :
                    svg.refs['bools'].refs[element].isSelected());
            } else {
                return element.some(isAllTrue);
            }
        }

        return this.props.parents.every(isAllTrue);
    }

    updateNode(recursive) {
        var newState;
        if (this.arePrereqsSatisfied()) {
            if (this.isSelected() || this.props.hybrid) {
                newState = 'active';
            } else {
                newState = 'takeable';
            }
        } else {
            if (this.isSelected() && !this.props.hybrid) {
                newState = 'overridden';
            } else {
                newState = 'inactive';
            }
        }

        var nodeId = this.props.JSON.id_;

        // Check whether need to update children
        if ((['active', 'overridden'].indexOf(newState) >= 0) ===
            (['active', 'overridden'].indexOf(this.state.status) >= 0) &&
            this.state.status !== 'missing') {
            localStorage.setItem(nodeId, newState);
            this.setState({ status: newState });
            return;
        }

        if (recursive === undefined || recursive) {
            var svg = this.props.svg;
            this.setState({ status: newState }, function () {
                localStorage.setItem(nodeId, newState);
                this.props.childs.forEach(function (node) {
                    var currentNode = refLookUp(node, svg);
                    currentNode.updateNode();
                });
                var allEdges = this.props.outEdges.concat(this.props.inEdges);
                allEdges.forEach(function (edge) {
                    var currentEdge = svg.refs['edges'].refs[edge];
                    currentEdge.updateStatus();
                }.bind(this));
            });
        } else {
            this.setState({ status: newState });
            localStorage.setItem(nodeId, newState);
        }
    }

    toggleSelection() {
        this.setState({ selected: !this.state.selected }, function () {
            this.updateNode();
        })
    }

    focusPrereqs() {
        var svg = this.props.svg;
        var id = this.props.JSON.id_;
        // Check if there are any missing prerequisites.
        if (['inactive', 'overridden', 'takeable'].indexOf(this.state.status) >= 0) {
            this.setState({ status: 'missing' }, () => {
                this.props.inEdges.forEach((edge) => {
                    var currentEdge = svg.refs['edges'].refs[edge];
                    var sourceNode = refLookUp(currentEdge.props.source, svg);
                    if (!sourceNode.isSelected()) {
                        currentEdge.setState({ status: 'missing' });
                    }
                });
                var isHybrid = this.props.hybrid;
                this.props.parents.forEach((node) => {
                    if (typeof node === 'string') {
                        var currentNode = refLookUp(node, svg);
                        currentNode.focusPrereqs();
                    } else {
                        node.forEach(n => {
                            var currentNode = refLookUp(n, svg);
                            currentNode.focusPrereqs();
                        });
                    }
                });
            });
        }
    }

    unfocusPrereqs() {
        var svg = this.props.svg;
        this.updateNode(false);
        this.props.parents.forEach(function (node) {
            if (typeof node === 'string') {
                var currentNode = refLookUp(node, svg);
                currentNode.unfocusPrereqs();
            } else {
                node.forEach(n => {
                    var currentNode = refLookUp(n, svg);
                    currentNode.unfocusPrereqs();
                });
            }
        });
        this.props.inEdges.forEach(function (edge) {
            var currentEdge = svg.refs['edges'].refs[edge];
            if (currentEdge.state.status === 'missing') {
                currentEdge.updateStatus();
            }
        });
    }

    render() {
        var newClassName = this.props.className + ' ' + this.state.status;
        if (this.props.highlighted) {
            var attrs = this.props.JSON;
            var width = parseFloat(attrs.width) / 2;
            var height = parseFloat(attrs.height) / 2;
            var ellipse = (
                <ellipse
                    className='spotlight'
                    cx={parseFloat(attrs.pos[0]) + width}
                    cy={parseFloat(attrs.pos[1]) + height}
                    rx={width + 9}
                    ry={height + 8.5} />
            );
        } else {
            var ellipse = null;
        }

        var gAttrs = {
            'textRendering': 'geometricPrecision',
            'shapeRendering': 'geometricPrecision',
            'onKeyDown': this.props.svg.onKeyDown,
            'onWheel': this.props.svg.onWheel,
            'onMouseEnter': this.props.onMouseEnter,
            'onMouseLeave': this.props.onMouseLeave,
            'onClick': this.props.onClick,
        };

        var rectAttrs = {
            height: this.props.JSON.height,
            width: this.props.JSON.width,
            rx: '4',
            ry: '4',
            x: this.props.JSON.pos[0],
            y: this.props.JSON.pos[1]
        };

        var rectStyle = {
            fill: this.props.JSON.fill
        }

        var textXOffset = this.props.JSON.pos[0] + this.props.JSON.width / 2;

        // TODO: Look at this.props to see what we need to give the g
        return (
            <g {...gAttrs}

                id={this.props.JSON.id_}
                className={newClassName} >
                {ellipse}
                <rect {...rectAttrs} style={rectStyle} />
                {this.props.JSON.text.map(function (textTag, i) {
                    var textAttrs = {
                        x: textXOffset,
                        y: textTag.pos[1]
                    };
                    return (
                        <text {...textAttrs} key={i}>
                            {textTag.text}
                        </text>);
                })}
            </g>
        );
    }
}