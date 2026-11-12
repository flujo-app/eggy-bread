# Eggy Bread

A tiny browser game. Drag eggs into a hungry slice of bread. Feed it 50 eggs and it becomes Eggy Bread.

That's the plan, anyway. The longer you play, the less the rules make sense. Meanwhile your coworkers keep messaging you about a real problem at work.

**Play it here:** https://flujo-app.github.io/eggy-bread/

## How to play

- Drag an egg from the carton (bottom right) into the loaf's mouth (bottom left).
- Or tap an egg to toss it. Space tosses one too.
- Keep an eye on the yellow rules note. It will change.
- Answer your coworkers in the chat. Your only options are "mm-hm", "yep", "totally" and "one sec".
- Press **B** if someone walks by.

Sound on is best: a robot voice counts your eggs (using your browser's built-in speech).

<details>
<summary>What happens (spoilers)</summary>

1. The voice counts honestly. For a while.
2. Then the count starts to wobble, and gets "corrected" downwards.
3. New rule: only brown eggs count. Then: only white eggs count, and brown eggs are minus one.
4. The loaf goes on a coffee break. Eggs bounce off its face.
5. Your free eggs expire. A shop pops up and offers 80 eggs. You can say no, watch a fake ad for one egg, and watch the price go up.
6. Bought eggs count as half an egg.
7. Then one egg is suddenly worth 47.
8. You win. There is a bonus stage. The loaf takes off its crust. It is censored.
9. Your coworkers notice.

</details>

The shop is pretend: no real money, no payment details, nothing is sent anywhere. Your sound and voice settings are kept in your own browser.

## Run it on your computer

There is no build step. Serve the folder with any static web server, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## What's in here

| File | What it does |
| --- | --- |
| `index.html` | The page: game window, office chat, fake spreadsheet for the boss key |
| `style.css` | The retro desktop look |
| `js/main.js` | The game, the rules that keep changing, the shop, the bonus stage |
| `js/art.js` | All drawing (kitchen, loaf, eggs, carton, crate, stage) |
| `js/audio.js` | Sound effects, the robot voice, the bonus music |
| `js/chat.js` | The coworker chat |

Everything is drawn in code and all sounds are made in the browser. No image or sound files.

## License

MIT
