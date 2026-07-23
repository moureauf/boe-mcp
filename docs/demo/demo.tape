# Regenerate docs/demo/demo.gif:  vhs docs/demo/demo.tape   (run from repo root)
Output docs/demo/demo.gif

Set Shell "zsh"
Set FontSize 20
Set Width 900
Set Height 420
Set Theme "Dracula"
Set Padding 20
Set TypingSpeed 45ms

Type `echo "boe-mcp: live Bank of England data over MCP, no auth needed"`
Enter
Sleep 900ms
Type "./docs/demo/demo.sh get_current_rate"
Enter
Sleep 2500ms
Type "./docs/demo/demo.sh get_next_mpc_meeting"
Enter
Sleep 2800ms
