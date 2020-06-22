import { asserts } from "./deps.ts";
import { MockServerRequest } from "./src/mocks/server_request.ts";
import { TestCase } from "./src/test_case.ts";

/**
 * Example:
 *
 * {
 *   suites: {
 *     "My Suite": {
 *       cases: [
 *         {
 *           name: "My Case",
 *           new_name: this.formatTestCaseName(name),
 *           testFn: Function
 *         },
 *         ...
 *       ],
 *       after_all_case_hook: Function,
 *       after_each_case_hook: Function,
 *       before_all_case_hook: Function,
 *       before_each_case_hook: Function
 *     },
 *     ... // More suites allowed
 *   },
 *   after_all_suite_hook: Function;
 *   after_each_suite_hook: Function;
 *   before_all_suite_hook: Function;
 *   before_each_suite_hook: Function;
 * }
 *
 * or:
 *
 * {
     suites: {
       run(): {
         cases: [Array],
         after_all_case_hook: [Function],
         before_all_case_hook: [Function],
         before_each_case_hook: [Function],
         after_each_case_hook: [Function]
       },
       close(): {
         cases: [Array],
         after_all_case_hook: [Function],
         before_all_case_hook: [Function],
         before_each_case_hook: [Function],
         after_each_case_hook: [Function]
       }
     },
      before_each_suite_hook: [Function],
      after_each_suite_hook: [Function],
     after_all_suite_hook: [Function],
     before_all_suite_hook: [Function]
 * }
 */
interface IPlan {
  suites: {
    [key: string]: { // suite names
      cases?: Array<{
        name: string;
        new_name: string;
        testFn: Function;
      }>;
      after_all_case_hook: Function | null;
      after_each_case_hook: Function | null;
      before_all_case_hook: Function | null;
      before_each_case_hook: Function | null;
    };
  };
  after_all_suite_hook: Function | null;
  after_each_suite_hook: Function | null;
  before_all_suite_hook: Function | null;
  before_each_suite_hook: Function | null;
}

/**
 * @description
 *     Deno's test runner outputs "test ", which has a length of 5. This module
 *     erases the "test " string by backspacing the test plan line and test
 *     suite line by that number. For safety, it substracts twice that number.
 *     This is how we get the number 10 here.
 */
const extraChars = 10;

/**
 * @description
 *     This testing framework allows the following syntax:
 *
 *         import { Rhum } from "/path/to/rhum/mod.ts";
 *
 *         Rhum.testPlan("test_plan_1", () => {
 *
 *           Rhum.testSuite("test_suite_1a", () => {
 *             Rhum.testCase("test_case_1a1", () => {
 *               Rhum.asserts.assertEquals(true, true);
 *             });
 *             Rhum.testCase("test_case_1a2", () => {
 *               Rhum.asserts.assertEquals(true, true);
 *             });
 *             Rhum.testCase("test_case_1a3", () => {
 *               Rhum.asserts.assertEquals(true, true);
 *             });
 *           });
 *
 *           Rhum.testSuite("test_suite_1b", () => {
 *             Rhum.testCase("test_case_1b1", () => {
 *               Rhum.asserts.assertEquals(true, true);
 *             });
 *             Rhum.testCase("test_case_1b2", () => {
 *               Rhum.asserts.assertEquals(true, true);
 *             });
 *             Rhum.testCase("test_case_1b3", () => {
 *               Rhum.asserts.assertEquals(true, true);
 *             });
 *           });
 *
 *         });
 *
 * Special thanks to
 *     @crookse (https://github.com/crookse)
 *     @ebebbington (https://github.com/ebebbington)
 */
export class RhumRunner {
  public asserts: any;
  public mocks: any = {};

  protected passed_in_test_plan: string = "";
  protected passed_in_test_suite: string = "";
  protected test_plan_in_progress: string = "";
  protected test_suite_in_progress: string = "";
  protected plan: IPlan = {
    suites: {},
    after_all_suite_hook: null,
    after_each_suite_hook: null,
    before_all_suite_hook: null,
    before_each_suite_hook: null,
  };

  // FILE MARKER - METHODS - CONSTRUCTOR ///////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor() {
    this.asserts = asserts;
    this.mocks.ServerRequest = MockServerRequest;
  }

  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////

  /**
   * @description
   *     Register an before each hook.
   *
   * @param Function cb
   *    The callback to invoke. Would contain the required logic you need
   *    to do what you want, before each test suite or case.
   *
   * @return void
   */
  public beforeEach(cb: Function): void {
    // Check if the hook is for test cases inside of a suite
    if (this.passed_in_test_plan && this.passed_in_test_suite) {
      // is a before each inside a suite for every test case
      this.plan.suites[this.passed_in_test_suite].before_each_case_hook = cb;
    } else if (this.passed_in_test_plan && !this.passed_in_test_suite) {
      // before each hooks for the suites
      this.plan.before_each_suite_hook = cb;
    }
  }

  /**
   * @description
   *     Register an after each hook.
   *
   * @param Function cb
   *    The callback to invoke. Would contain the required logic you need
   *    to do what you want, after each test suite or case.
   *
   * @return void
   */
  public afterEach(cb: Function): void {
    // Check if the hook is for test cases inside of a suite
    if (this.passed_in_test_plan && this.passed_in_test_suite) {
      // is a after each inside a suite for every test case
      this.plan.suites[this.passed_in_test_suite].after_each_case_hook = cb;
    } else if (this.passed_in_test_plan && !this.passed_in_test_suite) {
      // after each hooks for the suites
      this.plan.after_each_suite_hook = cb;
    }
  }

  /**
   * @description
   *     Register an after all hook.
   *
   * @param Function cb
   *    The callback to invoke. Would contain the required logic you need
   *    to do what you want, after all test suites or cases.
   *
   * @return void
   */
  public afterAll(cb: Function): void {
    // Check if the hook is for test cases inside of a suite
    if (this.passed_in_test_plan && this.passed_in_test_suite) {
      // is a before all inside a suite for every test case
      this.plan.suites[this.passed_in_test_suite].after_all_case_hook = cb;
    } else if (this.passed_in_test_plan && !this.passed_in_test_suite) {
      // before all hooks for the suites
      this.plan.after_all_suite_hook = cb;
    }
  }

  /**
   * @description
   *     Register an before all hook.
   *
   * @param Function cb
   *    The callback to invoke. Would contain the required logic you need
   *    to do what you want, before all test suites or cases.
   *
   * @return void
   */
  public beforeAll(cb: Function): void {
    // Check if the hook is for test cases inside of a suite
    if (this.passed_in_test_plan && this.passed_in_test_suite) {
      // is a before all inside a suite for every test case
      this.plan.suites[this.passed_in_test_suite].before_all_case_hook = cb;
    } else if (this.passed_in_test_plan && !this.passed_in_test_suite) {
      // before all hooks for the suites
      this.plan.before_all_suite_hook = cb;
    }
  }

  /**
   * @description
   * @param Function cb
   *
   * @return void
   *
   * TODO(#5)
   */
  public only(cb: Function): void {
    // Do something
  }

  /**
   * @description
   *     Skip a test plan, suite, or case.
   *
   * @param string name
   * @param Function cb
   *
   * @return void
   *
   * TODO(ebebbington|crookse) Maybe we could still call run, but pass in { ignore: true } which the Deno.Test will use? just so it displays ignored in the console
   */
  public skip(name: string, cb: Function): void {
    // Haaaaaa... you got skipped.
  }

  /**
   * @description
   *     Define a test case and execute the test function.
   *
   * @param string name
   *     The name of the test case.
   * @param Function testFn
   *     The test to execute.
   *
   * @return void
   */
  public testCase(name: string, testFn: Function): void {
    // @ts-ignore
    // TODO(crookse) figure out why this still give sthe "Object is possibly
    // undefined" error even though we check if the object exists
    this.plan.suites[this.passed_in_test_suite].cases.push({
      name,
      new_name: this.formatTestCaseName(name),
      testFn,
    });
  }

  /**
   * @description
   *     Define a test plan and execute the test plan's test suites.
   *
   * @param string name
   *     The name of the test plan.
   * @param Function testSuites
   *     The test suites to execute.
   *
   * @return void
   */
  public testPlan(name: string, testSuites: Function): void {
    this.passed_in_test_suite = ""; // New plan
    this.passed_in_test_plan = name;
    testSuites();
  }

  /**
   * @description
   *     Define a test suite and execute the test suite's test cases.
   *
   * @param string name
   *     The name of the test suite.
   * @param Function testCases
   *     The test cases to execute.
   *
   * @return void
   */
  public testSuite(name: string, testCases: Function): void {
    this.passed_in_test_suite = name;
    this.plan.suites[name] = {
      cases: [],
      after_all_case_hook: null,
      after_each_case_hook: null,
      before_all_case_hook: null,
      before_each_case_hook: null,
    };
    testCases();
  }

  /**
   * Run the test plan
   */
  public run(): void {
    const tc = new TestCase(this.plan);
    tc.run();
  }

  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////

  /**
   * @description
   *     Figure out the name of the test case for output purposes.
   *
   * @param string name
   *     The name of the test case.
   *
   * @return string
   */
  protected formatTestCaseName(name: string): string {
    let newName: string;
    if (this.test_plan_in_progress != this.passed_in_test_plan) {
      this.test_plan_in_progress = this.passed_in_test_plan;
      this.test_suite_in_progress = this.passed_in_test_suite;
      newName = `${"\u0008".repeat(name.length + extraChars)}` +
        `${" ".repeat(name.length + extraChars)}` +
        `\n${this.passed_in_test_plan}` +
        `\n    ${this.passed_in_test_suite}` +
        `\n        ${name} ... `;
    } else {
      if (this.test_suite_in_progress != this.passed_in_test_suite) {
        this.test_suite_in_progress = this.passed_in_test_suite;
        newName = `${"\u0008".repeat(name.length + extraChars)}` +
          `    ${this.passed_in_test_suite}` +
          `${" ".repeat(name.length + extraChars)}` +
          `\n        ${name} ... `;
      } else {
        newName = `${"\u0008".repeat(name.length + extraChars)}` +
          `        ${name} ... `;
      }
    }

    return newName;
  }
}

export const Rhum = new RhumRunner();
