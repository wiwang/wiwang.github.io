---
layout: post
title: A plain introduce to Bias and Variance
---

What is bias and variance? this is one of the most important stepping stones in machine learning, understanding bias and variance is important to learn the concepts of overfitting and underfitting.

## Bias and Variance example: favorite beer

A marketer want to investigate which brand of beer do people living China perfer, an interesting question, if you are asked this quesiton, how would you approach this problem?

You can not just go around and ask all people about their opinions, why? because there are 1.3 billion population in China, we can not reach out all individuals to ask their favorite beer. one thing you can do is ask your friend circle about their preference of beer and get an overall estimate of beer preference. but we have a problem with this analysis which is obious: your estimation is suffering from `bias` or we say your sample is `biased`.

In your case, chances are most of your friends who have the hobby as you. Intuitively, I feel that the city you and your friends live also determine what kind of beer you like. Like me, I live in Shanghai and I’d never heard of Zhujiang Beer,  Snow flake beer was the best beer I had tasted. So we can’t estimate the most preferred brand of beer in China just from the sample of your friends. I basically can conclude your model is too `simple` and `highly-biased`

Instead, The company this marketer work on would like to invest a huge amount of money on this questionare, this marketer can send a paid questionare to as many people as possible in China, then figure out a really complicated model to predict the most favorite beer in each cities, each counties and even each villages. when the company use this model to market its prodcuts into a new area, the sales results surprisely is not good and sometimes get worse. the problem of this model is too `complex` and take too many questionare result into consideration, it has a `high variant` estimation on most popular beer.

## Bias and Variance in machine learning
Bias is the degree of error produced on train data. If the model performs well on the train data and gives low error, it is said to have low bias. Whereas a model which is not trained well and gives high error on training data, will have high bias.

Similarly variance is the degree of error calculated on test data. A model performing well on the test data with low error is said to have low variance. high error on test data indicates high variance.

## Underfitting and Overfitting in machine learning
In machine learning, our purpose is to create a generalized model, this type of model should have following characteristics:
- Learns from the train data such that it finds the necessary patterns, at the same time does not be over-trained on the trainning data.
- Gives good predictions on test data with low error.


### Conclusion
If a model is trained so well on the train data that it fits each data point accurately, it will give highly accurate results on the train data but the same model will fail on test data. Thus we can say that low bias and high variance leads to overfitting.
If the model does not fit well for both the train as well as the test data, the error rate will remain high for both train and test data. Such model will have high bias and high variance. This phenomenon is be called underfitting.
