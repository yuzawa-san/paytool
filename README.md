# paytool

A tool for simplifying payments

offline storage version:
[http://yuzawa-san.github.io/paytool/](http://yuzawa-san.github.io/paytool/)

app engine version:
[http://pay-tool.appspot.com/](http://pay-tool.appspot.com/)


# How It Works
This tool takes in a set of debts and simplifies the number of exchanges of money that need to occur.
The set of debts is a directed weighted graph, where the vertices are people and the edges are the debts.
The weight on the edges is the amount of debt.

## Algorithm

Here is some pseudocode:

```
topological_sort(PEOPLE)

for person 'r' in PEOPLE:
    for person 't' in PEOPLE who is not 'r':
        for person 's' who is not 'r' or 't':
            A = what person 'r' owes person 's' 
            B = what person 's' owes person 't'
            if A and B are nonzero:
                if B > A:
                    add A to what person 'r' owes person 't'
                    update what person 'r' owes person 's' to 0
                    update what person 's' owes person 't' to B - A
                else:
                    add B to what person 'r' owes person 't'
                    update what person 'r' owes person 's' to A - B
                    update what person 's' owes person 't' to 0
```

## Failure

If there is a cycle, then the topological sort step will fail and there is no clearly defined solution.

## Privacy

This tool uses client-side storage, so the debt information is not sent elsewhere. The data only lives in your browser. Specifically, this uses WebSQL Database.