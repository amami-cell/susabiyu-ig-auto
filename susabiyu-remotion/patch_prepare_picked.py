import io
fn = "prepare.py"
s = io.open(fn, encoding="utf-8-sig").read()
done = []

a1 = "        run('python ' + fetch + ' \"' + creds + '\"')\n"
add1 = ("        picked_json = \"\"\n"
        "        try:\n"
        "            picked_json = open(os.path.join(\"out\", \"picked.json\"), encoding=\"utf-8\").read()\n"
        "        except Exception:\n"
        "            pass\n")
if "picked_json = open(" in s:
    done.append("ALREADY picked read")
elif s.count(a1) == 1:
    s = s.replace(a1, a1 + add1, 1); done.append("picked read OK")
else:
    done.append("NG picked read x%d" % s.count(a1))

a2 = ('sh.values().append(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:I",\n'
      '            valueInputOption="RAW", insertDataOption="INSERT_ROWS",\n'
      '            body={"values": [[token, when, dec["slot"], pattern, uri, cap, kindstr, "pending", ""]]}).execute()')
b2 = ('sh.values().append(spreadsheetId=SHEET_ID, range=APP_TAB + "!A:J",\n'
      '            valueInputOption="RAW", insertDataOption="INSERT_ROWS",\n'
      '            body={"values": [[token, when, dec["slot"], pattern, uri, cap, kindstr, "pending", "", picked_json]]}).execute()')
if "picked_json]]" in s:
    done.append("ALREADY append")
elif s.count(a2) == 1:
    s = s.replace(a2, b2, 1); done.append("append OK")
else:
    done.append("NG append x%d" % s.count(a2))

io.open(fn, "w", encoding="utf-8-sig").write(s)
print(" / ".join(done))
