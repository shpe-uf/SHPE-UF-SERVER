from selenium.webdriver.support.ui import Select
from selenium import webdriver
import requests
import json
import time

driver = webdriver.Chrome(executable_path=r'C:/Users/hp/Documents/chromedriver_win32/chromedriver.exe')
url = "https://one.ufl.edu/soc/"

driver.get(url)
time.sleep(10)
html = driver.page_source
time.sleep(5)
#The visible text part needs to be changed each semester and the json needs to be reloaded once that is done
selectSemester = Select(driver.find_element_by_id('semes')).select_by_visible_text('Fall 2020')
time.sleep(5)
selectProgram = Select(driver.find_element_by_id('prog')).select_by_visible_text('Campus / Web / Special Program')
time.sleep(5)
searchButton = driver.find_element_by_xpath('//*[@id="filterSidebar"]/button')
searchButton.click()
time.sleep(5)

for x in range(84):
    loadButton = driver.find_element_by_id('loadBtn')
    loadButton.click()
    time.sleep(5)
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
