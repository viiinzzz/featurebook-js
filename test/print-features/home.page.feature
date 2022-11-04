@priority:low
@businessvalue:precious
@timecriticality:later
@timeestimate:5-man-days
@issue:314
@sprint:1
Feature: Home page

    - As a registered user of the application
    - I want my home page to greet me personally
    - So that I feel I am a valuable member of the community
    - And I want personnalised suggestions
    - So that I discover new products

    Scenario: View the Home page
        Given I have a working browser
        When I enter the webapp url
        Then I can view the home page
        And I can read Welcome
        And I can read the values shared by the community

