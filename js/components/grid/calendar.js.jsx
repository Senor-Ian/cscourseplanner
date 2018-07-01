/* Holds the containers of the Fall and Spring timetables,
 * and performs some pre-processing steps with a list of 'Lecture' objects
 */
export class Row extends React.Component {
  render() {
    // From a list of Course objects, create a list of Lecture objects
    let courses = this.props.courses;
    let lectures = courses.map(
      c => Array.prototype.concat.apply([], Object.values(c.lectures))
    );
    lectures = Array.prototype.concat.apply([], lectures);

    // Organize the structure of the <fallSession> and <springSession> 2-D dictionaries
    let fallSession, springSession;
    [fallSession, springSession] = initializeSessions(lectures);

    // For each session, set the 'width' attribute of each Lecture
    // (go to Lecture constructor for definition of 'width')
    setWidths(fallSession);
    setWidths(springSession);

    // Fill session colSpans dictionaries
    let fallColSpans = {'M': 0, 'T': 0, 'W': 0, 'R': 0, 'F': 0};
    let springColSpans = {'M': 0, 'T': 0, 'W': 0, 'R': 0, 'F': 0};
    storeColSpans(fallSession, fallColSpans);
    storeColSpans(springSession, springColSpans);

    // Generate a container for each of the Fall and Spring timetables individually
    return (
      <div className="col-md-8 col-xs-12">
        <TimetableContainer session="F" lectures={fallSession} headColSpans={fallColSpans} />
        <TimetableContainer session="S" lectures={springSession} headColSpans={springColSpans} />
      </div>
    );
  }
}

/*
 * The container specifies formatting for all of the elements wrapped inside,
 * (for example, every element inside a container will follow the same margin rules)
 */
class TimetableContainer extends React.Component {
  render() {
    return (
      <div className="col-md-6 col-xs-12 timetable-container">
        <Timetable session={this.props.session} lectures={this.props.lectures} headColSpans={this.props.headColSpans}/>
      </div>
    );
  }
}

/*
 * A <table> element for the specified session
 */
class Timetable extends React.Component {
  render() {
    return(
      <table className={"timetable table"} id={"timetable-" + this.props.session}>
        <TimetableHeader session={this.props.session} lectures={this.props.lectures} headColSpans={this.props.headColSpans}/>
        <TimetableBody session={this.props.session} lectures={this.props.lectures} headColSpans={this.props.headColSpans}/>
      </table>
    );
  }
}

/*
 * Describes what the header of a table should look like, based on the session.
 * The header contains five day cells, a dummy cell, and a term-name cell
 */
class TimetableHeader extends React.Component {
  render() {
    let days = ['M', 'T', 'W', 'R', 'F'];
    let dayStrings = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    let colSpans = this.props.headColSpans;

    let dayCells = [];
    for (let i = 0; i < 5; i++) {
      let dayKey = days[i];
      let dayString = dayStrings[i];
      // Store the React element for this day-cell
      dayCells.push(
        <th scope="col" colSpan={colSpans[dayKey]}
          key={"day-header-" + i}>
          {dayString}
        </th>
      );
    }

    if (this.props.session === "F") {
      return (
        <thead>
          <tr>
            <th className="timetable-dummy-cell"></th>
            <th className="term-name">Fall</th>
            {dayCells}
          </tr>
        </thead>
      );
    } else {
      return (
        <thead>
          <tr>
            {dayCells}
            <th className="term-name">Spring</th>
            <th className="timetable-dummy-cell"></th>
          </tr>
        </thead>
      );
    }
  }
}

/*
 * Describes the body of the Timetable
 */
class TimetableBody extends React.Component {
  render() {
    let rows = [];
    // For each row from 8 o'clock to 22 o'clock, there is an 'Hour' and 'Half hour' row
    for (let i = 8; i < 22; i++) {
      rows.push(
        <TimetableRow
          session={this.props.session}
          time={i}
          key={'timetable-row-' + i + this.props.session}
          currentLectures={this.props.lectures[i]}
          previousLectures={this.props.lectures[i-1]}
          headColSpans={this.props.headColSpans}
        />
      );
      rows.push(
        <TimetableRow session={this.props.session}
          time={i+0.5}
          key={'timetable-row-' + (i+0.5) + this.props.session}
        />
      );
    }

    return <tbody>{rows}</tbody>;
  }
}

/*
 * Describes what a row in the Timetable should look like,
 * based off of the session, time, and previous cells generated.
 */
class TimetableRow extends React.Component {
  render() {
    let tableData = [];
    let days = ['M', 'T', 'W', 'R', 'F'];
    let dummyCell = <td key="timetable-dummy-cell" className="timetable-dummy-cell"></td>;
    let currTime = this.props.time;
    let currSess = this.props.session;

    // If the time describes a row that starts at the hour
    // (for example, at 8:00 rather than 8:30)
    if (currTime % 1 === 0) {
      // Convert <time> to a 12-hour clock system
      let adjustedTime = (currTime === 12 ? 12 : currTime % 12) + ':00';
      let timeCell = <td key="timetable-time" className="timetable-time" rowSpan="2">{adjustedTime}</td>

      // The dictionary of lectures for this hour, and the hour before
      let currentLectures = this.props.currentLectures;
      let previousLectures = this.props.previousLectures;
      let headColSpans = this.props.headColSpans;

      days.forEach(function(day) {
        // Initialize attributes of the cell in this day-and-time slot
        let alreadyGenerated = false;
        let lectureCode = "";
        let type = "";
        let clicked = false;
        let className = "timetable-cell";
        let rowSpan = 2;
        let colSpan = 0;
        let inConflict = false;

        // Variables for calculations
        let dayCell = null;
        let headerColSpan = headColSpans[day];
        let totalColSpans = 0;
        let lecColSpan = 0;

        // Get the list of lectures at this time-day slot, as well as the list of lectures
        // occuring one hour prior this time-day slot
        let currentLectureList = currentLectures[day];
        let previousLectureList = previousLectures[day];

        if (currentLectureList.length != 0) {
          // Render every lecture at this day-time slot (there can be more than one in a conflict case)
          currentLectureList.forEach(function(lecture) {
            // Check if this lecture has been previously rendered
            previousLectureList.forEach(function(lecturePrev) {
              if (lecturePrev.courseCode === lecture.courseCode){
                alreadyGenerated = true;
              }
            });

            // The 'colSpan' of the cells taken by this lecture, in this time-day slot
            // This should always be an integer value, since headerColSpan is the product of all
            // possible lecture widths in that day.
            lecColSpan = headerColSpan / lecture.width;

            if (!alreadyGenerated) {
              rowSpan = 2 * (lecture.endTime - lecture.startTime);
              lectureCode = lecture.courseCode;
              type = "L";
              clicked = true;
              className = "timetable-cell timetable-edge";
              inConflict = lecture.inConflict;
              colSpan = lecColSpan;
              tableData.push(
                <td id={'' + day + currTime + '-0' + totalColSpans + currSess}
                  key={'' + day + currTime + '-0' + totalColSpans + currSess}
                  data-in-conflict={inConflict}
                  data-satisfied={"true"}
                  rowSpan={rowSpan}
                  colSpan={colSpan}
                  className={className}
                  type={type}
                  clicked={clicked}
                  data-currentlecturelist={currentLectureList}
                >
                  {lectureCode}
                </td>
              );
            }
            alreadyGenerated = false;

            // Record the total width taken up by this time-day slot so far,
            // from all the lectures generated
            totalColSpans += lecColSpan;
          });

          // In the case where there are not enough cells to fill the headerColSpan
          // of this time-day cell, generate remaining number of empty cells
          for (let i = totalColSpans; i < headerColSpan; i++) {
            tableData.push(
              <td id={'' + day + currTime + '-0' + i + currSess}
                key={'' + day + currTime + '-0' + i + currSess}
                data-in-conflict="false"
                data-satisfied="true"
                rowSpan="2"
                className="timetable-cell">
              </td>
            );
          }
        } else {
          // No courses to be generated at this day-time cell
          // Generate the number of empty cells to fill the header colSpan
          for (let i = 0; i < headerColSpan; i++) {
            tableData.push(
              <td id={'' + day + currTime + '-0' + i + currSess}
                key={'' + day + currTime + '-0' + i + currSess}
                data-in-conflict="false"
                data-satisfied="true"
                rowSpan="2"
                className="timetable-cell">
              </td>
            );
          }
        }
      });

      // Adjust the order at which these cells are rendered
      if (currSess === 'F') {
        tableData.unshift(timeCell);
        tableData.unshift(dummyCell);
      } else if (currSess === 'S') {
        tableData.push(timeCell);
        tableData.push(dummyCell);
      }

    // Otherwise, the time describe a row that starts at the half hour (for example, at 8:30)
    // For these such rows, generate five empty dayCells
    } else {
      for (let i = 0; i < 5; i++) {
        tableData.push(
          <td id={'' + days[i] + this.props.time.toString().replace('.', '-') + this.props.session + 'H'}
            key={'' + days[i] + this.props.time.toString().replace('.', '-') + this.props.session + 'H'}
            data-in-conflict="false"
            data-satisfied="true"
            rowSpan="1"
            className="timetable-cell timetable-half-cell">
          </td>
        );
      }
      // Adjust the order at which these cells are rendered
      if (this.props.session === 'F') {
        tableData.unshift(dummyCell);
      } else if (this.props.session === 'S') {
        tableData.push(dummyCell);
      }
    }
    return <tr>{tableData}</tr>;
  }
}

/**
  * Helper function to initialize the <fallSession> and <springSession> 2-D dictionaries
  * @param {list} lectures : List of 'Lecture' objects
  */
function initializeSessions(lectures) {
  let fallSession = {};
  let springSession = {};
  for (let i = 7; i < 22; i++) {
    fallSession[i] = {"M": [], "T": [], "W": [], "R": [], "F": []};
    springSession[i] = {"M": [], "T": [], "W": [], "R": [], "F": []};
  }

  lectures.forEach(lecture => {
    if (lecture.session === 'F' || lecture.session === 'Y') {
      for (let i = lecture.startTime; i < lecture.endTime; i++) {
        // Store this Lecture in its active time-slot (denoted by <i>),
        // and in the list in its active day slot (denoted by <lecture.day>), in <fallSession>.
        fallSession[i][lecture.day].push(lecture);
      }
    }
    if (lecture.session === 'S' || lecture.session === 'Y') {
      // Same process as above for spring lectures in <springSession>
      for (let i = lecture.startTime; i < lecture.endTime; i++) {
        springSession[i][lecture.day].push(lecture);
      }
    }
  });

  return [fallSession, springSession];
}

/**
 * Helper function which sets the width of each Lecture,
 * and also sets the inConflict attribute of all Lecture objects
 * @param {dictionary} session : 2-D Dictionary storing lectures active in the session
 */
function setWidths(session) {
  let days = ['M', 'T', 'W', 'R', 'F'];
  // Reset all widths back to 1 and inConflict to false
  for (let i = 8; i < 22; i++) {
    let timeRow = session[i];
    days.forEach(function(day) {
      let timeDaySlot = timeRow[day];
      timeDaySlot.forEach(lecture => {
        lecture.width = 1;
        lecture.inConflict = false;
      });
    });
  }
  // Iterate through every time-slot in the session
  for (let i = 8; i < 22; i++) {
    let timeRow = session[i];
    days.forEach(function(day) {
      let timeDaySlot = timeRow[day];
      // If in this time-and-day slot there is a lecture conflict
      if (lectureConflict(timeDaySlot)) {
        // Readjust (if needed) the 'width's of the lectures at this slot
        timeDaySlot.forEach(lecture => {
          if (lecture.width < timeDaySlot.length) {
            lecture.width = timeDaySlot.length;
          }
          // Also specify that this lecture is in conflict
          lecture.inConflict = true;
        });
      }
    });
  }
}

/**
 * Helper function which stores the 'colSpan' attribute value for each day in the table header
 * @param {dictionary} colSpans : Dictionary storing the 'colSpan' attribute value for each day
 */
function storeColSpans(session, colSpans) {
  let days = ['M', 'T', 'W', 'R', 'F'];
  // For each day, stores all possible 'width' values every lecture at that day could have
  let widths = storeWidths(session);
  days.forEach(day => {
    // The 'colSpan' attribute of a header day cell is defined as the product of all
    // possible widths that could occur at that day
    colSpans[day] = widths[day].reduce((a, b) => a * b, 1);
  });
}

/**
 * Helper function which, for each day, stores all possible 'width' values the lectures in that day could have
 * @param {dictionary} session : 2-D Dictionary storing lectures active in the session
 */
function storeWidths(session) {
  let days = ['M', 'T', 'W', 'R', 'F'];
  let widths = {};
  // Iterate through every time-day slot in the session
  days.forEach(day => {
    widths[day] = [];
    for (let i = 8; i < 22; i++) {
      let timeRow = session[i];
      let timeDaySlot = timeRow[day];
      // If there are lectures running at this time-day slot
      if (timeDaySlot.length > 0) {
        // Retrieve a lecture width at this time-day slot
        let width = timeDaySlot[0].width;
        // Store the width of this lecture, if it hasn't already been stored
        if (widths[day].indexOf(width) < 0) {
          widths[day].push(width);
        }
      }
    }
  });
  return widths;
}

/**
 * Helper function which returns if there is a course conflict at a time-and-day slot
 * (denoted by the number of courses in the list at this time-and-day slot)
*/
function lectureConflict(courseList) {
  return courseList.length > 1;
}