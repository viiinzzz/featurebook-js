@priority:high
@businessvalue:precious @timecriticality:soon @timeestimate:3-man-days
@issue:15
@sprint:1
Feature: Act 1 Scene 5

  Scenario: Revenge his foul and most unnatural murder

    Given The ghost tells Hamlet how he was murdered by his brother, Claudius.
    When He reveals that Claudius poured poison in his ear while he was asleep
    And managed to seduce Gertrude
    Then He instructs Hamlet to 'Revenge his foul and most unnatural murder'.

  Scenario: don't tell anyone

    Given The ghost disappears
    When Hamlet tells Horatio and Marcellus what has happened
    Then he begs them not to tell anyone.

  Scenario: we swear

    Given The ghost reappears
    When he forces them to 'Swear.'
    Then The two men immediately give their word.
