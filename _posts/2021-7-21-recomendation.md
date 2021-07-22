---
layout: post
title: Everything You Need to Know about Recommendation System
---

# Introduction

# Approaches

## Collaborative filtering

## Content-based filtering
How Netflix’s Recommendations System Works
Our business is a subscription service model that offers personalized recommendations, to help you find shows and movies of interest to you. To do this we have created a proprietary, complex recommendations system. This article provides a high level description of our recommendations system in plain language.

The basics
Whenever you access the Netflix service, our recommendations system strives to help you find a show or movie to enjoy with minimal effort. We estimate the likelihood that you will watch a particular title in our catalog based on a number of factors including:

your interactions with our service (such as your viewing history and how you rated other titles),

other members with similar tastes and preferences on our service, and

information about the titles, such as their genre, categories, actors, release year, etc.

In addition to knowing what you have watched on Netflix, to best personalize the recommendations we also look at things like:

the time of day you watch,

the devices you are watching Netflix on, and

how long you watch.

All of these pieces of data are used as inputs that we process in our algorithms. (An algorithm is a process or set of rules followed in a problem solving operation.) The recommendations system does not include demographic information (such as age or gender) as part of the decision making process.

If you’re not seeing something you want to watch, you can always search the entire catalog available in your country. We try to make searching as easy and quick as possible. When you enter a search query, the top results we return are based on the actions of other members who have entered the same or similar queries.

Below is a description of how the system works over time, and how these pieces of information influence what we present to you.

“Jump starting” the recommendations system
When you create your Netflix account, or add a new profile in your account, we ask you to choose a few titles that you like. We use these titles to “jump start” your recommendations. Choosing a few titles you like is optional. If you choose to forego this step then we will start you off with a diverse and popular set of titles to get you going.

Once you start watching titles on the service, this will “supercede” any initial preferences you provided us, and as you continue to watch over time, the titles you watched more recently will outweigh titles you watched in the past in terms of driving our recommendations system.

Rows, rankings and title representation
In addition to choosing which titles to include in the rows on your Netflix homepage, our system also ranks each title within the row, and then ranks the rows themselves, using algorithms and complex systems to provide a personalized experience. To put this another way, when you look at your Netflix homepage, our systems have ranked titles in a way that is designed to present the best possible ordering of titles that you may enjoy.

In each row there are three layers of personalization:

the choice of row (e.g. Continue Watching, Trending Now, Award-Winning Comedies, etc.)

which titles appear in the row, and

the ranking of those titles.

The most strongly recommended rows go to the top. The most strongly recommended titles start on the left of each row and go right -- unless you have selected Arabic or Hebrew as your language in our systems, in which case these will go right to left.

How we improve our recommendations system
We take feedback from every visit to the Netflix service and continually re-train our algorithms with those signals to improve the accuracy of their prediction of what you’re most likely to watch. Our data, algorithms, and computation systems continue to feed into each other to produce fresh recommendations to provide you with a product that brings you joy.

See our Privacy and Security help page for information on more topics.
## Hybrid approaches

## Deep learning

## Bayesian Personalised Ranking for Implicit Data

## Variational Autoencoders for Collaborative Filtering


# Benchmarks

## MovieLens Benchmarks for Traditional Setup
## Microsoft Tutorial on Recommendation System at KDD 2019


# Evaluations
## Evaluating Recommendation Systems
