import React from "react";

/**
 * A React component representing the disclaimer popup
 */
export default class Disclaimer extends React.Component {
    handleClose = () => {
        var disclaimer = document.getElementById("disclaimerDiv");
        disclaimer.classList.toggle("dismiss");
    }

    handleCheck = () => {
        localStorage.setItem('DontShowDisclaimer', 'true');
    }

    render() {
        var timetable = <a href="https://timetable.iit.artsci.utoronto.ca/">Official Timetable</a>;
        var calendar = <a href="http://calendar.artsci.utoronto.ca/">Calendar</a>;

        return (
            <div id="disclaimerDiv" className="disclaimer-popup">
                <p><b>DISCLAIMER:</b> Both the {timetable} and {calendar} take precedence over the information
                 presented here. It's important that you double-check your course selection, prerequisites,
                  and your program plans. Some graph edges may represent a corequisite rather than a prerequisite.</p>
                <label>
                    <input type="checkbox" id="disclaimerCheck" onClick={this.handleCheck} />
                    Do not show this again
                </label>
                <button id="closeDisclaimer" onClick={this.handleClose}>&times;</button>
            </div>
        )
    }
}