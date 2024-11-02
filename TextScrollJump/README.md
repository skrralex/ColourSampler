# starter

Make sure the sender is using the 'hand' model.

Basic sketch ready for use.

`updateFromHands(data)`
* Place to do initial processing of raw data
* This gets called whenever new data is received from the sender. It can be slow and timing inconsistent.
  
`update()`
* Place to mutate state over time (eg smoothing, incorporating time)
* Ought to end by saving state
* This gets called at a faster and consistent rate

`use()`
* Uses the state updated by the other two functions. This runs at fast rate.
* Eg. make visual updates to the DOM or canvas.