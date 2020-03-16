
const Boom = require('boom');
const Schmervice = require('schmervice');
const _ = require('underscore');

module.exports = class QuestionBucketService extends Schmervice.Service {
  async findAll(txn) {
    const { QuestionBucket } = this.server.models();
    const questionBuckets = await QuestionBucket.query(txn);
    return questionBuckets;
  }

  async findById(id, txn) {
    const { QuestionBucket } = this.server.models();
    const questionBucket = await QuestionBucket.query(txn).throwIfNotFound().findById(id);
    return questionBucket;
  }

  async create(details, txn = null) {
    const { QuestionBucket } = this.server.models();
    const createQuestionBucket = await QuestionBucket.query(txn).insertGraph(details);
    return createQuestionBucket;
  }

  async findChoicesByBucketId(bucketId, txn = null) {
    const { QuestionBucketChoice, Question } = this.server.models();

    const choices = await QuestionBucketChoice.query(txn).where({ bucketId });
    const promises = [];
    _.each(choices, (choice, i) => {
      const { questionIds } = choice;
      promises.push(Question.query(txn).whereIn('id', questionIds).then((questions) => {
        choices[i].questions = questions;
      }));
    });
    await Promise.all(promises);

    return choices;
  }

  async createChoice(bucket, details, txn = null) {
    const { QuestionBucketChoice, Question } = this.server.models();

    const { questionIds } = details;

    // check if all the IDs in the `questionIds` are valid
    const questions = await Question.query(txn).whereIn('id', questionIds);
    if (questions.length !== questionIds.length) {
      throw Boom.badRequest('All the questionIds given are not valid.');
    }

    // check if the require num of question as per bucket & length of `questionIds` is equal
    if (questions.length !== bucket.numQuestions) {
      throw Boom.badRequest('The number of questions in a bucket choice should be equal to what is specified in the bucket.');
    }

    // insert into DB
    const choice = await QuestionBucketChoice.query(txn).insertGraph({
      bucketId: bucket.id,
      ...details,
    });

    // return back the choice
    choice.questions = questions;
    return choice;
  }

  async updateChoice(id, details, txn = null) {
    const { QuestionBucketChoice } = this.server.models();

    let bucketChoice = await QuestionBucketChoice.query(txn).throwIfNotFound().findById(id);
    bucketChoice = await QuestionBucketChoice.query(txn).patchAndFetchById(id, { ...details }).where({ id });

    return bucketChoice;
    
  }
};
