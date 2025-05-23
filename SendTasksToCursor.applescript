set taskFile to "/Volumes/Data/work/tpnow/tasks.md"

-- Read the file contents as lines
set taskLines to paragraphs of (read POSIX file taskFile)

repeat with i from 1 to count of taskLines
	set lineText to item i of taskLines
	
	-- Match tasks that start with - [ ] or * [ ]
	if lineText starts with "- [ ]" or lineText starts with "* [ ]" then
		-- Extract task text after the checklist marker
		set taskText to text ((offset of "] " in lineText) + 2) of lineText
		set taskText to my trimText(taskText)
		
		-- Tell Cursor IDE to activate and type the instruction
		tell application "Cursor"
			activate
			delay 0.5
		end tell
		
		tell application "System Events"
			keystroke "Please complete this task and update tasks.md accordingly: " & taskText
			delay 0.2
			key code 36 -- press Enter
		end tell
		
		-- Wait for confirmation before moving to the next
		display dialog "Sent task to Cursor:\n\n" & taskText & "\n\nClick 'Next' to continue." buttons {"Next"} default button "Next"
	end if
end repeat

display dialog "🎉 All unchecked tasks have been sent!" buttons {"OK"} default button "OK"

-- Trimming helper
on trimText(txt)
	set prevTIDs to AppleScript's text item delimiters
	set AppleScript's text item delimiters to {space, tab}
	set trimmed to text items of txt
	set AppleScript's text item delimiters to " "
	set resultText to trimmed as text
	set AppleScript's text item delimiters to prevTIDs
	return resultText
end trimText
