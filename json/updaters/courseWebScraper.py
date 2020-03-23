from selenium.webdriver.support.ui import Select
from selenium import webdriver
import requests
import json
import time
import math

driver = webdriver.Chrome(executable_path=r'C:/Users/hp/Documents/chromedriver_win32/chromedriver.exe')
url = "https://one.ufl.edu/soc/"

driver.get(url)
time.sleep(10)
html = driver.page_source
time.sleep(3)
selectSemester = Select(driver.find_element_by_id('semes')).select_by_visible_text('Fall 2020')
time.sleep(3)
selectProgram = Select(driver.find_element_by_id('prog')).select_by_visible_text('Campus / Web / Special Program')
time.sleep(3)
searchButton = driver.find_element_by_xpath('//*[@id="filterSidebar"]/button')
searchButton.click()
time.sleep(3)
totalCourses = driver.find_element_by_id('totalCount').text
strTotal = totalCourses.split()
timesToClick = int(strTotal[0])
showMore = (math.floor(timesToClick / 50)) + 1

time.sleep(3)

for x in range(showMore):
    if x == showMore:
        break
    loadButton = driver.find_element_by_id('loadBtn')
    loadButton.click()
    time.sleep(4)

courseArr = []
for course in driver.find_elements_by_class_name('course-code'):
    courseObject = {
        "key": course.find_element_by_tag_name('h3').text,
        "value": course.find_element_by_tag_name('h3').text
    }
    courseArr.append(courseObject)

with open('courses.json', 'w') as outfile:
    json.dump(courseArr, outfile)

driver.close()
