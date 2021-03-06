import React from "react";
import PropTypes from "prop-types";

export default class GraphDropdown extends React.Component{

  render() {
    let className = "hidden";
    let graphTabLeft = 0;
    if (document.querySelector("a[href='/graph']")){
      graphTabLeft = document.querySelector("a[href='/graph']").getBoundingClientRect().left;
      if (this.props.showGraphDropdown){
        className = "graph-dropdown-display";
      }
    }

    return (
      <ul
        className={className}
        onMouseMove={this.props.onMouseMove}
        onMouseLeave={this.props.onMouseLeave}
        data-testid={"test-graph-dropdown"}
        style={{left:graphTabLeft}}
      >
        {this.props.graphs.map((graph, i) => {
        return <li
                key={i}
                className="graph-dropdown-item"
                onClick={() => this.props.updateGraph(graph.title)}
                data-testid={"test-graph-" + i}
                >
                {graph.title}
                </li>
      })}
      </ul>
      )
  }
}

GraphDropdown.propTypes = {
  showGraphDropdown: PropTypes.bool,
  onMouseMove: PropTypes.func,
  onMouseLeave: PropTypes.func,
  graphs: PropTypes.array,
  updateGraph: PropTypes.func
}
