const scaleRating = {
  "Very poor": 0.2,
  Poor: 0.4,
  Average: 0.6,
  Good: 0.8,
  Excellent: 1,
};
const candidateScaleRating = {
  "Very poor": 10,
  Poor: 47,
  Average: 84,
  Good: 121,
  Excellent: 158,
};

const candidateBar = 158;
const evaluatorBar = 170;

const assignTopQuestion = async ({ candidateResponse, referencesResponse }) => {
  return new Promise((resolve) => {
    const candidateQuestionId = "63517d5ca1bf7b0d4bd024af";
    const evaluatorQuestionId = "63517f9cd5decb2291ef14df";
    let candidateAnswer = candidateResponse.filter(
      (r) => r.question == candidateQuestionId
    );
    let referencesAnswer = referencesResponse.filter(
      (r) => r.question == evaluatorQuestionId
    );
    let objectAnswer = {};
    let responseArray = [...candidateAnswer.concat(referencesAnswer)];
    for (let i = 0; i < responseArray.length; i++) {
      const element = responseArray[i];
      objectAnswer[element.result] = objectAnswer[element.result]
        ? objectAnswer[element.result].concat([element.user.firstName])
        : [element.user.firstName];
    }
    const result = Object.keys(objectAnswer).map((key) => {
      return { option: key, response: objectAnswer[key] };
    });
    resolve(result);
  });
};

const experienceAndWorkAgain = async ({ referencesResponse }) => {
  return new Promise(async (resolve) => {
    const expQuestionId = "63517f9cd5decb2291ef14e0";
    const workQuestionId = "63517f9cd5decb2291ef14e5";
    let referencesAnswer = referencesResponse.filter(
      (r) => r.question == expQuestionId || r.question == workQuestionId
    );
    let objectAnswer = {};
    let responseArray = [...referencesAnswer];
    for (let i = 0; i < responseArray.length; i++) {
      const element = responseArray[i];
      if (objectAnswer[element.user.email]) {
        objectAnswer[element.user.email][
          element.question == expQuestionId ? "experience" : "work"
        ] =
          element.question == expQuestionId
            ? element.result
            : await workAgain({ answer: element.result });
        objectAnswer[element.user.email]["evaluator"] =
          element["user"]["firstName"];
      } else {
        objectAnswer[element.user.email] = {
          [element.question == expQuestionId ? "experience" : "work"]:
            element.question == expQuestionId
              ? element.result
              : await workAgain({ answer: element.result }),
        };
      }
    }
    const result = Object.keys(objectAnswer).map((key) => objectAnswer[key]);
    resolve(result);
  });
};

const softSkills = async ({ candidateResponse, referencesResponse }) => {
  return new Promise((resolve) => {
    const candidateQuestionId = "6352300b5a33e806e6800854";
    const evaluatorQuestionId = "6352300b5a33e806e6800856";
    let candidateAnswer = candidateResponse.find(
      (r) => r.question == candidateQuestionId
    );
    let candidateFormatAnswer = JSON.parse(candidateAnswer.result);
    let mapAsnwer = {};
    for (let i = 0; i < candidateFormatAnswer.length; i++) {
      const element = candidateFormatAnswer[i];
      mapAsnwer[element.description] = {
        description: element.description,
        // candidateValue: candidateScaleRating[element.value] * candidateBar,
        candidateValue: candidateScaleRating[element.value],
        evaluatorValue: 0,
      };
    }
    let referencesAnswer = referencesResponse.filter(
      (r) => r.question == evaluatorQuestionId
    );
    const propSum = 100 / referencesAnswer.length;
    for (let i = 0; i < referencesAnswer.length; i++) {
      const evaluatorFormatAnswer = JSON.parse(referencesAnswer[i].result);
      for (let index = 0; index < evaluatorFormatAnswer.length; index++) {
        const element = evaluatorFormatAnswer[index];
        mapAsnwer[element.description]["evaluatorValue"] =
          mapAsnwer[element.description]["evaluatorValue"] +
          scaleRating[element.value] * evaluatorBar * (propSum / 100);
      }
    }
    const result = Object.keys(mapAsnwer).map((key) => {
      return mapAsnwer[key];
    });
    const middleIndex = Math.ceil(result.length / 2);
    resolve({
      firstSoftSkils: result.splice(0, middleIndex),
      secondSoftSkils: result.splice(-middleIndex),
    });
  });
};

const softSkillsTwo = async ({ candidateResponse, referencesResponse }) => {
  return new Promise((resolve) => {
    const candidateQuestionId = "6352300b5a33e806e6800855";
    const evaluatorQuestionId = "6352300b5a33e806e6800857";
    let candidateAnswer = candidateResponse.find(
      (r) => r.question == candidateQuestionId
    );
    let candidateFormatAnswer = JSON.parse(candidateAnswer.result);
    let mapAsnwer = {};
    for (let i = 0; i < candidateFormatAnswer.length; i++) {
      const element = candidateFormatAnswer[i];
      mapAsnwer[element.description] = {
        description: element.description,
        // candidateValue: candidateScaleRating[element.value] * candidateBar,
        candidateValue: candidateScaleRating[element.value],
        evaluatorValue: 0,
      };
    }
    let referencesAnswer = referencesResponse.filter(
      (r) => r.question == evaluatorQuestionId
    );
    const propSum = 100 / referencesAnswer.length;
    for (let i = 0; i < referencesAnswer.length; i++) {
      const evaluatorFormatAnswer = JSON.parse(referencesAnswer[i].result);
      for (let index = 0; index < evaluatorFormatAnswer.length; index++) {
        const element = evaluatorFormatAnswer[index];
        mapAsnwer[element.description]["evaluatorValue"] =
          mapAsnwer[element.description]["evaluatorValue"] +
          scaleRating[element.value] * evaluatorBar * (propSum / 100);
      }
    }
    const result = Object.keys(mapAsnwer).map((key) => {
      return mapAsnwer[key];
    });
    resolve(result);
  });
};

const buildTeam = async ({ candidateResponse }) => {
  return new Promise(async (resolve) => {
    const startFromScratchQuestionId = "63517d5ca1bf7b0d4bd024b2";
    const hiredBeforeQuestionId = "63517d5ca1bf7b0d4bd024b5";
    let candidateAnswer = candidateResponse.filter(
      (r) =>
        r.question == startFromScratchQuestionId ||
        r.question == hiredBeforeQuestionId
    );
    let objectAnswer = {};
    let responseArray = [...candidateAnswer];
    for (let i = 0; i < responseArray.length; i++) {
      const element = responseArray[i];
      objectAnswer[
        element.question == hiredBeforeQuestionId ? "hired" : "scratch"
      ] =
        element.question == hiredBeforeQuestionId
          ? await hiredBefore({ answer: element.result })
          : element.result;
    }
    resolve(objectAnswer);
  });
};

const investInThem = async ({ referencesResponse }) => {
  return new Promise(async (resolve) => {
    const investInThemQuestionId = "63517f9cd5decb2291ef14e2";
    let referencesAnswer = referencesResponse.filter(
      (r) => r.question == investInThemQuestionId
    );
    let objectAnswer = {};
    let responseArray = [...referencesAnswer];
    const answerAmount = responseArray.length;
    for (let i = 0; i < responseArray.length; i++) {
      const element = responseArray[i];
      objectAnswer[element.result] = objectAnswer[element.result]
        ? objectAnswer[element.result].concat([element.user.firstName])
        : [element.user.firstName];
    }
    const result = Object.keys(objectAnswer).map((key) => {
      return {
        option: key,
        response: ((100 * objectAnswer[key].length) / answerAmount).toFixed(),
      };
    });
    resolve(await investInThemFormat({ answer: result }));
  });
};

const workAgain = async ({ answer }) => {
  return new Promise((resolve) => {
    let formatAnswer = answer.toLowerCase();
    let answerObject = {
      start: formatAnswer == "wouldn't mind" ? "" : "Would be ",
      mid: answer,
      end: " to work with the candidate again",
    };
    resolve(answerObject);
  });
};

const hiredBefore = async ({ answer }) => {
  return new Promise((resolve) => {
    let formatAnswer = answer.toLowerCase();
    let answerArray = ["The candidate "];
    answerArray.push(
      formatAnswer == "i haven’t hired people" ? "has not" : "has"
    );
    answerArray.push(" built teams ");
    answerArray.push(
      formatAnswer == "i haven’t hired people"
        ? ""
        : formatAnswer == "20+"
        ? "of 20+ people "
        : `of ${formatAnswer} `
    );
    answerArray.push("before.");
    resolve(answerArray);
  });
};

const investInThemFormat = async ({ answer }) => {
  return new Promise((resolve) => {
    let answerArray = [
      {
        percent: "",
        descriptionMid: "If this person was starting a business:",
        option: "",
        descriptionEnd: "",
      },
    ];
    if (answer.length == 1) {
      answerArray.push({
        percent: answer[0].response,
        descriptionMid: " of their references would ",
        option: answer[0].option,
        descriptionEnd: " invest in them.",
      });
    } else {
      for (let i = 0; i < answer.length; i++) {
        if (answer.length - 1 == i) {
          answerArray.push({
            percent: `${answer[i].response}%`,
            descriptionMid: " of their references would ",
            option: answer[i].option,
            descriptionEnd: " invest in them.",
          });
        } else if (answer.length - 2 == i) {
          answerArray.push({
            percent: `${answer[i].response}%`,
            descriptionMid: " of their references would ",
            option: answer[i].option,
            descriptionEnd: " invest in them and ",
          });
        } else {
          answerArray.push({
            percent: `${answer[i].response}%`,
            descriptionMid: " of their references would ",
            option: answer[i].option,
            descriptionEnd: " invest in them, ",
          });
        }
      }
    }

    resolve(answerArray);
  });
};

module.exports = {
  assignTopQuestion,
  experienceAndWorkAgain,
  softSkills,
  softSkillsTwo,
  buildTeam,
  investInThem,
};
