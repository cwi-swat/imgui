

"def" Id "(" {Param ","}* ")"
  RenderStat*
"end"


RenderStat
  = "on" Exp "do" UpdateStat* "end"
  | if
  | for
  | "ul" "{" RenderStat* "}"
  | call
  ....


UpdateStat
  = if
  | for
  | Location "=" Exp
  | call
 

