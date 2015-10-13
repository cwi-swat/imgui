


Model
=====

model.ql: the structure of the QL program
 Editing the questionnaire  modifies this object.

model.instance: a map from variable name to value.
  Using the questionnaire modifies this object.

history:
  a list of deltas representing modifications inbetween doRenders
  
pointInTime: index where we are in the history.
  
  
Execution
=========

editor render: just render the model so that it can be edited. If it
is edited, history is extended.  

preview render: interpreter model.ql
and adjust instance where needed. This also add elements to the
history.

NB: history is not diffed itself.

A slider can be used to go back and forward in time by
updating ql and instance according the diffs in history.

If you edit/use the questionnaire when back in time, -- history is
truncated and normal execution continues.
